// server/middleware/auth.js — Express-compatible JWT authentication helpers
const jwt = require('jsonwebtoken');
const { sql } = require('drizzle-orm');
const { db, ready } = require('../../db/client');

function getToken(req) {
  const authorization = req.headers?.authorization || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice(7).trim();
  const cookieHeader = req.headers?.cookie || '';
  const tokenPart = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('stream_token='));
  if (!tokenPart) return null;
  try { return decodeURIComponent(tokenPart.slice('stream_token='.length)); } catch { return null; }
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  return secret;
}

async function authenticate(req) {
  const token = getToken(req);
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  await ready;
  const rows = await db.all(sql`SELECT id, email, role, banned, created_at FROM users WHERE id = ${Number(payload.sub)}`);
  const user = rows[0] || null;
  return user && !Number(user.banned) ? user : null;
}

async function requireUser(req, res, next) {
  try {
    const user = await authenticate(req);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    req.user = user;
    return typeof next === 'function' ? next() : user;
  } catch (error) {
    if (typeof next === 'function') return next(error);
    throw error;
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await authenticate(req);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' });
    req.user = user;
    return typeof next === 'function' ? next() : user;
  } catch (error) {
    if (typeof next === 'function') return next(error);
    throw error;
  }
}

module.exports = { authenticate, requireUser, requireAdmin, getToken, jwtSecret };
