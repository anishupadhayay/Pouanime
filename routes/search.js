// api/search.js — search the published local catalogue
const { createHandler, json, query, dbAll, HttpError } = require('../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const term = String(query(req, 'q', '') || '').trim().slice(0, 100);
  if (term.length < 2) throw new HttpError(400, 'Search with at least 2 characters.');
  const page = Math.max(1, Math.min(500, Number(query(req, 'page', 1)) || 1));
  const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
  const results = await dbAll(`SELECT a.* FROM anime a WHERE a.published = 1 AND (a.title LIKE ? ESCAPE '\\' OR COALESCE(a.synopsis, '') LIKE ? ESCAPE '\\')
    ORDER BY a.popularity DESC, a.rating DESC LIMIT 48 OFFSET ?`, [pattern, pattern, (page - 1) * 48]);
  return json(res, 200, { results, page, query: term });
}, { methods: ['GET'], cache: 'public, max-age=15, stale-while-revalidate=60' });
