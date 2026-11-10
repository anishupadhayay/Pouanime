// api/admin/anime/bulk-import.js — import up to 50 AniList IDs with one metadata request
const { createHandler, json, parseBody, requireAdmin, validate, z } = require('../../../server/lib/api.js');
const { getAnimeByIds } = require('../../../server/lib/anilist');
const { importMediaList } = require('../../../server/lib/catalog');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const input = validate(z.object({
    anilist_ids: z.array(z.coerce.number().int().positive()).min(1).max(50),
    auto_create_episodes: z.boolean().optional().default(false),
  }).strict(), parseBody(req));
  const ids = [...new Set(input.anilist_ids)];
  const media = await getAnimeByIds(ids);
  const found = new Map(media.map((item) => [Number(item.id), item]));
  const available = ids.map((id) => found.get(id)).filter(Boolean);
  const failed = ids.filter((id) => !found.has(id)).map((anilist_id) => ({ anilist_id, error: 'Not found on AniList.' }));
  const rows = await importMediaList(available, { autoCreateEpisodes: input.auto_create_episodes });
  const byId = new Map(rows.map((row) => [Number(row.anilist_id), row]));
  const results = ids.filter((id) => byId.has(id)).map((id) => byId.get(id));
  return json(res, 200, { imported: results.length, failed, results });
}, { methods: ['POST'], rateKey: 'admin-bulk-import', rateLimit: 10, windowMs: 60000 });
