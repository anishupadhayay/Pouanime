// api/auth/login.js — authenticate an account and issue an HttpOnly JWT cookie
const bcrypt = require('bcryptjs');
const { createHandler, json, dbGet, parseBody, validate, HttpError, setSessionCookie, z } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const input = validate(z.object({
    email: z.string().trim().email('Enter a valid email address.').max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(72),
  }).strict(), parseBody(req));
  const user = await dbGet('SELECT id, email, password_hash, role, banned, created_at FROM users WHERE email = ?', [input.email]);
  const valid = user ? await bcrypt.compare(input.password, user.password_hash) : false;
  if (!valid || Number(user.banned)) throw new HttpError(401, 'Email or password is incorrect.');
  setSessionCookie(res, user.id);
  return json(res, 200, { user: { id: user.id, email: user.email, role: user.role, created_at: user.created_at } });
}, { methods: ['POST'], rateKey: 'auth-login', rateLimit: 12 });
