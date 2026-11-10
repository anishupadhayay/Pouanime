// api/anilist/search.js — cached AniList title search proxy
const { createHandler, json, query, HttpError } = require('../../server/lib/api.js');
const { searchAnime } = require('../../server/lib/anilist');

module.exports = createHandler(async (req, res) => {
  const term = String(query(req, 'q', '') || '').trim();
  if (term.length < 2) throw new HttpError(400, 'Search with at least 2 characters.');
  const page = Math.max(1, Math.min(100, Number(query(req, 'page', 1)) || 1));
  const data = await searchAnime(term, page);
  return json(res, 200, data);
}, { methods: ['GET'], rateKey: 'anilist', rateLimit: 30, windowMs: 60000, cache: 'public, max-age=60, stale-while-revalidate=300' });
