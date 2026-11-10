// api/auth/logout.js — clear the current JWT session cookie
const { createHandler, json, clearSessionCookie } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  clearSessionCookie(res);
  return json(res, 200, { ok: true });
}, { methods: ['POST'], rateKey: 'auth-logout', rateLimit: 60 });
