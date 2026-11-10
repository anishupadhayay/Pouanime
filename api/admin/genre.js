// api/admin/genre.js — administrator genre CRUD
const { createHandler, json, query, dbAll, dbGet, dbRun, parseBody, requireAdmin, validate, HttpError, slugSchema, z } = require('../../server/lib/api.js');
const { slugify } = require('../../server/lib/catalog');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const genres = await dbAll(`SELECT g.id, g.name, g.slug, COUNT(DISTINCT ag.anime_id) AS anime_count
      FROM genres g LEFT JOIN anime_genres ag ON ag.genre_id = g.id GROUP BY g.id ORDER BY g.name`);
    return json(res, 200, { genres });
  }
  const body = parseBody(req);
  if (req.method === 'POST') {
    const input = validate(z.object({ name: z.string().trim().min(1).max(80), slug: slugSchema.optional() }).strict(), body);
    const slug = input.slug || slugify(input.name);
    if (await dbGet('SELECT id FROM genres WHERE name = ? OR slug = ?', [input.name, slug])) throw new HttpError(409, 'A genre with that name or slug already exists.');
    const result = await dbRun('INSERT INTO genres (name, slug) VALUES (?, ?)', [input.name, slug]);
    return json(res, 201, { genre: await dbGet('SELECT * FROM genres WHERE id = ?', [Number(result.lastInsertRowid)]) });
  }
  const id = Number(body.id || query(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Genre ID is required.');
  const existing = await dbGet('SELECT * FROM genres WHERE id = ?', [id]);
  if (!existing) throw new HttpError(404, 'Genre was not found.');
  if (req.method === 'DELETE') {
    await dbRun('DELETE FROM genres WHERE id = ?', [id]);
    return json(res, 200, { ok: true });
  }
  const input = validate(z.object({ id: z.coerce.number().int().positive(), name: z.string().trim().min(1).max(80).optional(), slug: slugSchema.optional() }).strict(), body);
  const name = input.name || existing.name;
  const slug = input.slug || (input.name ? slugify(input.name) : existing.slug);
  if (await dbGet('SELECT id FROM genres WHERE (name = ? OR slug = ?) AND id <> ?', [name, slug, id])) throw new HttpError(409, 'A genre with that name or slug already exists.');
  await dbRun('UPDATE genres SET name = ?, slug = ? WHERE id = ?', [name, slug, id]);
  return json(res, 200, { genre: await dbGet('SELECT * FROM genres WHERE id = ?', [id]) });
}, { methods: ['GET', 'POST', 'PATCH', 'DELETE'], rateKey: 'admin', rateLimit: 120 });
