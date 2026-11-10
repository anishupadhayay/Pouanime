// api/admin/anime/[id].js — edit or delete a catalogue record
const { createHandler, json, param, dbGet, dbRun, parseBody, requireAdmin, validate, HttpError, safeHttpUrl, slugSchema, z } = require('../../../server/lib/api.js');

const patchSchema = z.object({
  title: z.string().trim().min(1).max(250).optional(),
  slug: slugSchema.optional(),
  synopsis: z.string().max(12000).nullable().optional(),
  poster: z.string().url().max(2000).nullable().optional(),
  banner: z.string().url().max(2000).nullable().optional(),
  year: z.coerce.number().int().min(1900).max(2200).nullable().optional(),
  season: z.string().max(20).nullable().optional(),
  type: z.string().max(30).nullable().optional(),
  status: z.string().max(30).nullable().optional(),
  rating: z.coerce.number().min(0).max(10).nullable().optional(),
  popularity: z.coerce.number().int().min(0).max(100000000).optional(),
  studio: z.string().max(250).nullable().optional(),
  total_episodes: z.coerce.number().int().min(1).max(5000).nullable().optional(),
  published: z.boolean().optional(),
}).strict();

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const id = Number(param(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Anime ID must be a positive integer.');
  const current = await dbGet('SELECT * FROM anime WHERE id = ?', [id]);
  if (!current) throw new HttpError(404, 'Anime was not found.');
  if (req.method === 'DELETE') {
    await dbRun('DELETE FROM anime WHERE id = ?', [id]);
    return json(res, 200, { ok: true });
  }
  const input = validate(patchSchema, parseBody(req));
  const entries = Object.entries(input);
  if (!entries.length) throw new HttpError(400, 'Provide at least one field to update.');
  for (const field of ['poster', 'banner']) {
    if (input[field] && !safeHttpUrl(input[field])) throw new HttpError(400, `${field} must be a secure HTTPS URL.`);
  }
  if (input.slug && input.slug !== current.slug && await dbGet('SELECT id FROM anime WHERE slug = ? AND id <> ?', [input.slug, id])) {
    throw new HttpError(409, 'That slug is already in use.');
  }
  const assignments = entries.map(([field]) => `${field} = ?`).join(', ');
  await dbRun(`UPDATE anime SET ${assignments} WHERE id = ?`, [...entries.map(([, value]) => value === true ? 1 : value === false ? 0 : value), id]);
  const anime = await dbGet('SELECT * FROM anime WHERE id = ?', [id]);
  return json(res, 200, { anime });
}, { methods: ['PATCH', 'PUT', 'DELETE'], rateKey: 'admin', rateLimit: 120 });
