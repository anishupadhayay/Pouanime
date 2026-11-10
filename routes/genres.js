// api/genres.js — genre directory with published catalogue counts
const { createHandler, json, dbAll } = require('../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const genres = await dbAll(`SELECT g.id, g.name, g.slug, COUNT(DISTINCT a.id) AS anime_count
    FROM genres g LEFT JOIN anime_genres ag ON ag.genre_id = g.id
    LEFT JOIN anime a ON a.id = ag.anime_id AND a.published = 1
    GROUP BY g.id, g.name, g.slug ORDER BY anime_count DESC, g.name ASC`);
  return json(res, 200, { genres });
}, { methods: ['GET'], cache: 'public, max-age=60, stale-while-revalidate=300' });
