// api/anilist/[id].js — fetch one anime's AniList metadata
const { createHandler, json, param, HttpError } = require('../../server/lib/api.js');
const { getAnimeById } = require('../../server/lib/anilist');

module.exports = createHandler(async (req, res) => {
  const id = Number(param(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'AniList ID must be a positive integer.');
  const media = await getAnimeById(id);
  if (!media) throw new HttpError(404, 'Anime was not found on AniList.');
  return json(res, 200, { anime: media });
}, { methods: ['GET'], rateKey: 'anilist', rateLimit: 30, windowMs: 60000, cache: 'public, max-age=60, stale-while-revalidate=300' });
