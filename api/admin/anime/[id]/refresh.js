// api/admin/anime/[id]/refresh.js — refresh AniList-sourced fields while preserving catalogue visibility
const { createHandler, json, param, dbGet, requireAdmin, HttpError } = require('../../../../server/lib/api.js');
const { getAnimeById } = require('../../../../server/lib/anilist');
const { importMedia } = require('../../../../server/lib/catalog');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const id = Number(param(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Anime ID must be a positive integer.');
  const existing = await dbGet('SELECT id, anilist_id FROM anime WHERE id = ?', [id]);
  if (!existing) throw new HttpError(404, 'Anime was not found.');
  if (!existing.anilist_id) throw new HttpError(400, 'This title was added manually and has no AniList ID.');
  const media = await getAnimeById(existing.anilist_id, { bypassCache: true });
  if (!media) throw new HttpError(404, 'Anime was not found on AniList.');
  const anime = await importMedia(media);
  return json(res, 200, { anime, refreshed: true });
}, { methods: ['POST'], rateKey: 'admin-refresh', rateLimit: 30, windowMs: 60000 });
