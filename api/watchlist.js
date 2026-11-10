// api/watchlist.js — authenticated per-user anime watchlist
const { createHandler, json, dbAll, dbGet, dbRun, parseBody, requireUser, validate, HttpError, z } = require('../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const user = await requireUser(req);
  if (req.method === 'GET') {
    const results = await dbAll(`SELECT a.* FROM watchlist w JOIN anime a ON a.id = w.anime_id
      WHERE w.user_id = ? AND a.published = 1 ORDER BY w.created_at DESC`, [user.id]);
    return json(res, 200, { results });
  }
  const body = parseBody(req);
  const input = validate(z.object({ anime_id: z.coerce.number().int().positive() }).strict(), body);
  const anime = await dbGet('SELECT id FROM anime WHERE id = ? AND published = 1', [input.anime_id]);
  if (!anime) throw new HttpError(404, 'Anime was not found.');
  if (req.method === 'POST') {
    await dbRun('INSERT OR IGNORE INTO watchlist (user_id, anime_id) VALUES (?, ?)', [user.id, input.anime_id]);
    return json(res, 200, { ok: true, saved: true });
  }
  if (req.method === 'DELETE') {
    await dbRun('DELETE FROM watchlist WHERE user_id = ? AND anime_id = ?', [user.id, input.anime_id]);
    return json(res, 200, { ok: true, saved: false });
  }
  throw new HttpError(405, 'Method not allowed.');
}, { methods: ['GET', 'POST', 'DELETE'], rateKey: 'watchlist', rateLimit: 120 });
