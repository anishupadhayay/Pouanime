// api/anime/index.js — paginated local catalogue with safe, allow-listed sorting
const { createHandler, json, query, dbAll, dbGet } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const page = Math.max(1, Math.min(500, Number(query(req, 'page', 1)) || 1));
  const pageSize = Math.max(1, Math.min(48, Number(query(req, 'limit', 24)) || 24));
  const sort = String(query(req, 'sort', 'popular')).toLowerCase();
  const orderBy = sort === 'latest' ? 'created_at DESC, id DESC' : sort === 'rating' ? 'rating DESC, popularity DESC' : sort === 'views' ? 'views DESC, popularity DESC' : 'popularity DESC, views DESC, id DESC';
  const genre = String(query(req, 'genre', '') || '').trim().slice(0, 100);
  const type = String(query(req, 'type', '') || '').trim().toUpperCase().slice(0, 20);
  const year = Number(query(req, 'year'));
  const seasonInput = String(query(req, 'season', '') || '').toLowerCase();
  const season = ['winter', 'spring', 'summer', 'fall'].includes(seasonInput) ? seasonInput : '';
  const conditions = ['a.published = 1'];
  const args = [];
  if (genre) {
    conditions.push('EXISTS (SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id WHERE ag.anime_id = a.id AND g.slug = ?)');
    args.push(genre);
  }
  if (type) { conditions.push('a.type = ?'); args.push(type); }
  if (Number.isInteger(year) && year >= 1900 && year <= 2200) { conditions.push('a.year = ?'); args.push(year); }
  if (season) { conditions.push('a.season = ?'); args.push(season); }
  const where = conditions.join(' AND ');
  const totalRow = await dbGet(`SELECT COUNT(*) AS total FROM anime a WHERE ${where}`, args);
  const results = await dbAll(`SELECT a.* FROM anime a WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...args, pageSize, (page - 1) * pageSize]);
  return json(res, 200, { results, page, pageSize, total: Number(totalRow?.total || 0) });
}, { methods: ['GET'], cache: 'public, max-age=30, stale-while-revalidate=120' });
