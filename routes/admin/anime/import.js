// api/admin/anime/import.js — fetch AniList metadata and upsert a catalogue title
const { createHandler, json, parseBody, requireAdmin, validate, HttpError, z } = require('../../../server/lib/api.js');
const { getAnimeById } = require('../../../server/lib/anilist');
const { importMedia } = require('../../../server/lib/catalog');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const input = validate(z.object({
    anilist_id: z.coerce.number().int().positive(),
    auto_create_episodes: z.boolean().optional().default(false),
  }).strict(), parseBody(req));
  const media = await getAnimeById(input.anilist_id);
  if (!media) throw new HttpError(404, 'Anime was not found on AniList.');
  const anime = await importMedia(media, { autoCreateEpisodes: input.auto_create_episodes });
  return json(res, 201, { anime, imported: true });
}, { methods: ['POST'], rateKey: 'admin-import', rateLimit: 30, windowMs: 60000 });
