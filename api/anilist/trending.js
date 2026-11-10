// api/anilist/trending.js — AniList trending proxy used by admin import tools
const { createHandler, json, query } = require('../../server/lib/api.js');
const { getTrendingAnime } = require('../../server/lib/anilist');

module.exports = createHandler(async (req, res) => {
  const page = Math.max(1, Math.min(100, Number(query(req, 'page', 1)) || 1));
  return json(res, 200, await getTrendingAnime(page));
}, { methods: ['GET'], rateKey: 'anilist', rateLimit: 30, windowMs: 60000, cache: 'public, max-age=60, stale-while-revalidate=300' });
