// api/admin/users.js — list accounts and safely update role or ban status
const { createHandler, json, query, dbAll, dbGet, dbRun, parseBody, requireAdmin, validate, HttpError, z } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const actor = await requireAdmin(req);
  if (req.method === 'GET') {
    const search = String(query(req, 'q', '') || '').trim().slice(0, 100);
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const users = await dbAll(`SELECT id, email, role, banned, created_at FROM users
      WHERE email LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 300`, [pattern]);
    return json(res, 200, { users });
  }
  const body = parseBody(req);
  const input = validate(z.object({
    id: z.coerce.number().int().positive(),
    role: z.enum(['user', 'admin']).optional(),
    banned: z.boolean().optional(),
  }).strict(), body);
  const user = await dbGet('SELECT id, email, role, banned FROM users WHERE id = ?', [input.id]);
  if (!user) throw new HttpError(404, 'User was not found.');
  if (req.method === 'DELETE') {
    if (Number(user.id) === Number(actor.id)) throw new HttpError(400, 'You cannot delete your own account while signed in.');
    if (user.role === 'admin') {
      const admins = await dbGet("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND banned = 0");
      if (Number(admins?.total || 0) <= 1) throw new HttpError(400, 'The last active administrator cannot be deleted.');
    }
    await dbRun('DELETE FROM users WHERE id = ?', [input.id]);
    return json(res, 200, { ok: true });
  }
  if (!input.role && input.banned === undefined) throw new HttpError(400, 'Provide a role or banned status.');
  if (Number(user.id) === Number(actor.id) && (input.role === 'user' || input.banned === true)) {
    throw new HttpError(400, 'You cannot remove your own administrator access or ban yourself.');
  }
  if (user.role === 'admin' && (input.role === 'user' || input.banned === true)) {
    const admins = await dbGet("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND banned = 0");
    if (Number(admins?.total || 0) <= 1) throw new HttpError(400, 'The last active administrator cannot be demoted or banned.');
  }
  const role = input.role ?? user.role;
  const banned = input.banned === undefined ? Number(user.banned) : (input.banned ? 1 : 0);
  await dbRun('UPDATE users SET role = ?, banned = ? WHERE id = ?', [role, banned, input.id]);
  return json(res, 200, { user: await dbGet('SELECT id, email, role, banned, created_at FROM users WHERE id = ?', [input.id]) });
}, { methods: ['GET', 'PATCH', 'DELETE'], rateKey: 'admin', rateLimit: 120 });
