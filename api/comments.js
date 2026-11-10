// api/comments.js — episode comments (new posts are held for moderation)
const { createHandler, json, query, dbAll, dbGet, dbRun, parseBody, requireUser, validate, HttpError, z } = require('../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  if (req.method === 'GET') {
    const episodeId = Number(query(req, 'episode_id'));
    if (!Number.isInteger(episodeId) || episodeId < 1) throw new HttpError(400, 'Episode ID is required.');
    const episode = await dbGet(`SELECT e.id FROM episodes e
      JOIN anime a ON a.id = e.anime_id AND a.published = 1
      WHERE e.id = ?`, [episodeId]);
    if (!episode) throw new HttpError(404, 'Episode was not found.');
    const comments = await dbAll(`SELECT c.id, c.text, c.created_at,
      CASE WHEN u.id IS NULL THEN 'Deleted account' ELSE 'Anime fan' END AS author
      FROM comments c LEFT JOIN users u ON u.id = c.user_id
      WHERE c.episode_id = ? AND c.approved = 1 ORDER BY c.created_at ASC LIMIT 100`, [episodeId]);
    return json(res, 200, { comments });
  }
  const user = await requireUser(req);
  const input = validate(z.object({
    episode_id: z.coerce.number().int().positive(),
    text: z.string().trim().min(2, 'Comment must be at least 2 characters.').max(1000, 'Comment is too long.'),
  }).strict(), parseBody(req));
  const episode = await dbGet(`SELECT e.id FROM episodes e
    JOIN anime a ON a.id = e.anime_id AND a.published = 1
    WHERE e.id = ?`, [input.episode_id]);
  if (!episode) throw new HttpError(404, 'Episode was not found.');
  await dbRun('INSERT INTO comments (user_id, episode_id, text, approved) VALUES (?, ?, ?, 0)', [user.id, episode.id, input.text]);
  return json(res, 201, { message: 'Your comment has been sent for review.' });
}, { methods: ['GET', 'POST'], rateKey: 'comments', rateLimit: 45 });
