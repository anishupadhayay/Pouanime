// api/trending.js — trending titles already published in the Stream catalogue
const { createHandler, json, query, dbAll } = require('../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const limit = Math.max(1, Math.min(48, Number(query(req, 'limit', 24)) || 24));
  const results = await dbAll('SELECT * FROM anime WHERE published = 1 ORDER BY popularity DESC, views DESC, rating DESC LIMIT ?', [limit]);
  return json(res, 200, { results });
}, { methods: ['GET'], cache: 'public, max-age=30, stale-while-revalidate=120' });
