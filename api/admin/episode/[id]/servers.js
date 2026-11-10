// api/admin/episode/[id]/servers.js — view or replace an episode's approved embed links
const { createHandler, json, param, dbGet, dbAll, parseBody, requireAdmin, validate, HttpError, z } = require('../../../../server/lib/api.js');
const { normalizeEmbedUrl } = require('../../../../server/lib/embeds');
const { client } = require('../../../../db/client');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const id = Number(param(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Episode ID must be a positive integer.');
  const episode = await dbGet('SELECT id FROM episodes WHERE id = ?', [id]);
  if (!episode) throw new HttpError(404, 'Episode was not found.');
  if (req.method === 'GET') {
    return json(res, 200, { servers: await dbAll('SELECT id, name, embed_url FROM servers WHERE episode_id = ? ORDER BY id', [id]) });
  }
  const input = validate(z.object({
    servers: z.array(z.object({
      name: z.string().trim().min(1).max(60),
      embed_url: z.string().trim().min(8).max(2000),
    }).strict()).max(10),
  }).strict(), parseBody(req));
  const servers = input.servers.map((server) => ({ name: server.name, embed_url: normalizeEmbedUrl(server.embed_url) }));
  if (servers.some((server) => !server.embed_url)) throw new HttpError(400, 'Only HTTPS Streamtape, Doodstream, Mixdrop, and YouTube embeds are accepted.');
  const statements = [{ sql: 'DELETE FROM servers WHERE episode_id = ?', args: [id] }];
  if (servers.length) {
    statements.push({
      sql: `INSERT INTO servers (episode_id, name, embed_url) VALUES ${servers.map(() => '(?, ?, ?)').join(', ')}`,
      args: servers.flatMap((server) => [id, server.name, server.embed_url]),
    });
  }
  // libSQL batch runs these statements in one write transaction; a failed insert
  // rolls back the delete so existing server links are not lost.
  await client.batch(statements, 'write');
  return json(res, 200, { servers: await dbAll('SELECT id, name, embed_url FROM servers WHERE episode_id = ? ORDER BY id', [id]) });
}, { methods: ['GET', 'POST'], rateKey: 'admin-servers', rateLimit: 120 });
