// api/anilist/popular.js — cached AniList popularity proxy for bulk import
const { createHandler, json, query } = require('../../server/lib/api.js');
const { getPopularAnime } = require('../../server/lib/anilist');

module.exports = createHandler(async (req, res) => {
  const page = Math.max(1, Math.min(100, Number(query(req, 'page', 1)) || 1));
  return json(res, 200, await getPopularAnime(page));
}, { methods: ['GET'], rateKey: 'anilist', rateLimit: 30, windowMs: 60000, cache: 'public, max-age=60, stale-while-revalidate=300' });
