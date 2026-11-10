// api/admin/anime/[id]/bulk-servers.js — apply embed URL templates across every episode
const { createHandler, json, param, dbGet, dbAll, parseBody, requireAdmin, validate, HttpError, z } = require('../../../../server/lib/api.js');
const { normalizeEmbedUrl } = require('../../../../server/lib/embeds');
const { client } = require('../../../../db/client');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const animeId = Number(param(req, 'id'));
  if (!Number.isInteger(animeId) || animeId < 1) throw new HttpError(400, 'Anime ID must be a positive integer.');
  if (!await dbGet('SELECT id FROM anime WHERE id = ?', [animeId])) throw new HttpError(404, 'Anime was not found.');
  const input = validate(z.object({
    servers: z.array(z.object({ name: z.string().trim().min(1).max(60), embed_url: z.string().trim().min(8).max(2000) }).strict()).min(1).max(10),
    replace_existing: z.boolean().optional().default(true),
  }).strict(), parseBody(req));
  const templates = input.servers.map((server) => ({
    name: server.name,
    template: server.embed_url,
  }));
  for (const server of templates) {
    const sample = normalizeEmbedUrl(server.template.replaceAll('{ep}', '1'));
    if (!sample) throw new HttpError(400, 'Templates must use HTTPS Streamtape, Doodstream, Mixdrop, or YouTube URLs. Use {ep} where the episode number should go.');
  }
  const episodes = await dbAll('SELECT id, ep_number FROM episodes WHERE anime_id = ? ORDER BY ep_number ASC', [animeId]);
  if (!episodes.length) throw new HttpError(400, 'This anime has no episodes yet.');
  const rows = [];
  for (const episode of episodes) {
    for (const server of templates) {
      const url = normalizeEmbedUrl(server.template.replaceAll('{ep}', String(episode.ep_number)));
      if (!url) throw new HttpError(400, `Invalid embed URL for episode ${episode.ep_number}.`);
      rows.push([episode.id, server.name, url]);
    }
  }

  const statements = [];
  if (input.replace_existing) {
    statements.push({
      sql: 'DELETE FROM servers WHERE episode_id IN (SELECT id FROM episodes WHERE anime_id = ?)',
      args: [animeId],
    });
  }
  // Keep each INSERT below SQLite's common 999-parameter limit (300 rows × 3 values).
  for (let start = 0; start < rows.length; start += 300) {
    const chunk = rows.slice(start, start + 300);
    statements.push({
      sql: `INSERT INTO servers (episode_id, name, embed_url) VALUES ${chunk.map(() => '(?, ?, ?)').join(', ')}`,
      args: chunk.flat(),
    });
  }
  // The delete and all inserts commit together or roll back together.
  await client.batch(statements, 'write');
  return json(res, 200, { episodes_updated: episodes.length, servers_created: rows.length });
}, { methods: ['POST'], rateKey: 'admin-bulk-servers', rateLimit: 30, windowMs: 60000 });
