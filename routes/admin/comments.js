// api/admin/comments.js — comment moderation queue
const { createHandler, json, query, dbAll, dbGet, dbRun, parseBody, requireAdmin, validate, HttpError, z } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const filter = String(query(req, 'status', 'all'));
    const where = filter === 'pending' ? 'WHERE c.approved = 0' : filter === 'approved' ? 'WHERE c.approved = 1' : '';
    const comments = await dbAll(`SELECT c.id, c.text, c.approved, c.created_at, u.email AS author,
      e.ep_number, a.title AS anime_title, a.slug AS anime_slug
      FROM comments c LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN episodes e ON e.id = c.episode_id LEFT JOIN anime a ON a.id = e.anime_id
      ${where} ORDER BY c.created_at DESC LIMIT 300`);
    return json(res, 200, { comments });
  }
  const body = parseBody(req);
  const input = validate(z.object({ id: z.coerce.number().int().positive(), approved: z.boolean().optional() }).strict(), body);
  if (!await dbGet('SELECT id FROM comments WHERE id = ?', [input.id])) throw new HttpError(404, 'Comment was not found.');
  if (req.method === 'DELETE') {
    await dbRun('DELETE FROM comments WHERE id = ?', [input.id]);
    return json(res, 200, { ok: true });
  }
  if (input.approved === undefined) throw new HttpError(400, 'Choose whether to approve this comment.');
  await dbRun('UPDATE comments SET approved = ? WHERE id = ?', [input.approved ? 1 : 0, input.id]);
  return json(res, 200, { ok: true, approved: input.approved });
}, { methods: ['GET', 'PATCH', 'DELETE'], rateKey: 'admin', rateLimit: 150 });
