// api/auth/me.js — return the signed-in account, if any
const { createHandler, json, requireUser } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const user = await requireUser(req);
  return json(res, 200, { user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at } });
}, { methods: ['GET'], rateKey: 'auth-me', rateLimit: 120 });
