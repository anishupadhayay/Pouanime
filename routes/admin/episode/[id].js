// api/admin/episode/[id].js — edit or remove one episode
const { createHandler, json, param, dbGet, dbRun, parseBody, requireAdmin, validate, HttpError, safeHttpUrl, z } = require('../../../server/lib/api.js');

const patchSchema = z.object({
  ep_number: z.coerce.number().int().min(1).max(5000).optional(),
  title: z.string().trim().max(250).nullable().optional(),
  thumbnail: z.string().url().max(2000).nullable().optional(),
  release_date: z.string().max(40).nullable().optional(),
}).strict();

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const id = Number(param(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Episode ID must be a positive integer.');
  const current = await dbGet('SELECT * FROM episodes WHERE id = ?', [id]);
  if (!current) throw new HttpError(404, 'Episode was not found.');
  if (req.method === 'DELETE') {
    await dbRun('DELETE FROM episodes WHERE id = ?', [id]);
    return json(res, 200, { ok: true });
  }
  const input = validate(patchSchema, parseBody(req));
  const fields = Object.entries(input);
  if (!fields.length) throw new HttpError(400, 'Provide at least one field to update.');
  if (input.thumbnail && !safeHttpUrl(input.thumbnail)) throw new HttpError(400, 'Thumbnail must be a secure HTTPS URL.');
  if (input.ep_number && input.ep_number !== Number(current.ep_number) && await dbGet('SELECT id FROM episodes WHERE anime_id = ? AND ep_number = ? AND id <> ?', [current.anime_id, input.ep_number, id])) {
    throw new HttpError(409, 'That episode number already exists for this anime.');
  }
  await dbRun(`UPDATE episodes SET ${fields.map(([name]) => `${name} = ?`).join(', ')} WHERE id = ?`, [...fields.map(([, value]) => value), id]);
  return json(res, 200, { episode: await dbGet('SELECT * FROM episodes WHERE id = ?', [id]) });
}, { methods: ['PATCH', 'PUT', 'DELETE'], rateKey: 'admin', rateLimit: 150 });
