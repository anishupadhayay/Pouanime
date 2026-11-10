// api/admin/episode.js — list episodes by anime or create a new episode
const { createHandler, json, query, dbAll, dbGet, dbRun, parseBody, requireAdmin, validate, HttpError, safeHttpUrl, z } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const animeId = Number(query(req, 'anime_id'));
    if (!Number.isInteger(animeId) || animeId < 1) throw new HttpError(400, 'Choose an anime first.');
    const episodes = await dbAll(`SELECT e.*, (SELECT COUNT(*) FROM servers s WHERE s.episode_id = e.id) AS server_count
      FROM episodes e WHERE e.anime_id = ? ORDER BY e.ep_number ASC`, [animeId]);
    return json(res, 200, { episodes });
  }
  const input = validate(z.object({
    anime_id: z.coerce.number().int().positive(),
    ep_number: z.coerce.number().int().min(1).max(5000),
    title: z.string().trim().max(250).nullable().optional(),
    thumbnail: z.string().url().max(2000).nullable().optional(),
    release_date: z.string().max(40).nullable().optional(),
  }).strict(), parseBody(req));
  if (input.thumbnail && !safeHttpUrl(input.thumbnail)) throw new HttpError(400, 'Thumbnail must be a secure HTTPS URL.');
  const anime = await dbGet('SELECT id FROM anime WHERE id = ?', [input.anime_id]);
  if (!anime) throw new HttpError(404, 'Anime was not found.');
  if (await dbGet('SELECT id FROM episodes WHERE anime_id = ? AND ep_number = ?', [input.anime_id, input.ep_number])) {
    throw new HttpError(409, 'That episode number already exists for this anime.');
  }
  const result = await dbRun(`INSERT INTO episodes (anime_id, ep_number, title, thumbnail, release_date)
    VALUES (?, ?, ?, ?, ?)`, [input.anime_id, input.ep_number, input.title || `Episode ${input.ep_number}`, input.thumbnail ?? null, input.release_date ?? null]);
  const episode = await dbGet('SELECT * FROM episodes WHERE id = ?', [Number(result.lastInsertRowid)]);
  return json(res, 201, { episode });
}, { methods: ['GET', 'POST'], rateKey: 'admin', rateLimit: 150 });
