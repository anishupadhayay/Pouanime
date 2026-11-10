// api/auth/register.js — create an ordinary Stream account
const bcrypt = require('bcryptjs');
const { createHandler, json, dbGet, dbRun, parseBody, validate, HttpError, setSessionCookie, z } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const input = validate(z.object({
    email: z.string().trim().email('Enter a valid email address.').max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password must be 72 characters or fewer.'),
  }).strict(), parseBody(req));
  if (Buffer.byteLength(input.password, 'utf8') > 72) throw new HttpError(400, 'Password must be 72 bytes or fewer.');
  if (await dbGet('SELECT id FROM users WHERE email = ?', [input.email])) throw new HttpError(409, 'An account with that email already exists.');
  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await dbRun('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [input.email, passwordHash, 'user']);
  const userId = Number(result.lastInsertRowid);
  const user = await dbGet('SELECT id, email, role, created_at FROM users WHERE id = ?', [userId]);
  setSessionCookie(res, userId);
  return json(res, 201, { user });
}, { methods: ['POST'], rateKey: 'auth-register', rateLimit: 8 });
