// api/latest.js — latest episodes from the local catalogue
const { createHandler, json, query, dbAll } = require('../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const limit = Math.max(1, Math.min(40, Number(query(req, 'limit', 20)) || 20));
  const results = await dbAll(`SELECT e.id AS episode_id, e.ep_number, e.title AS episode_title, e.thumbnail, e.release_date,
    a.id AS anime_id, a.title AS anime_title, a.slug, a.poster, a.banner, a.year, a.type, a.status, a.rating
    FROM episodes e JOIN anime a ON a.id = e.anime_id
    WHERE a.published = 1
    ORDER BY COALESCE(e.release_date, e.id) DESC, e.ep_number DESC LIMIT ?`, [limit]);
  return json(res, 200, { results });
}, { methods: ['GET'], cache: 'public, max-age=15, stale-while-revalidate=60' });
