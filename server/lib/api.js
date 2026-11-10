// server/lib/api.js — shared Drizzle-backed API utilities, authentication, validation, and throttling
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const { sql } = require('drizzle-orm');
const { db, client, ready } = require('../../db/client');
const { authenticate, jwtSecret } = require('../middleware/auth');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const rateBuckets = new Map();
function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function allowRate(req, key, limit, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const bucketKey = `${key}:${clientIp(req)}`;
  let bucket = rateBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(bucketKey, bucket);
  }
  bucket.count += 1;
  if (rateBuckets.size > 8000) {
    for (const [savedKey, value] of rateBuckets) {
      if (value.resetAt <= now) rateBuckets.delete(savedKey);
      if (rateBuckets.size < 6000) break;
    }
  }
  return bucket.count <= limit;
}

function json(res, status, payload) {
  if (res.headersSent) return;
  res.status(status).json(payload);
}

function query(req, name, fallback = undefined) {
  const found = req.query?.[name];
  if (found !== undefined) return Array.isArray(found) ? found[0] : found;
  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const value = parsed.searchParams.get(name);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function param(req, name) {
  const direct = req.params?.[name];
  if (direct !== undefined) return Array.isArray(direct) ? direct[0] : direct;
  return query(req, name);
}

function preparedStatement(text, args = []) {
  const parts = String(text).split('?');
  if (parts.length - 1 !== args.length) throw new Error('SQL parameter count does not match.');
  let statement = sql.raw(parts[0]);
  for (let index = 0; index < args.length; index += 1) {
    statement = sql`${statement}${args[index]}${sql.raw(parts[index + 1])}`;
  }
  return statement;
}

async function dbAll(text, args = []) {
  await ready;
  const rows = await db.all(preparedStatement(text, args));
  return rows.map((row) => ({ ...row }));
}

async function dbGet(text, args = []) {
  await ready;
  const rows = await db.all(preparedStatement(text, args));
  return rows[0] ? { ...rows[0] } : null;
}

async function dbRun(text, args = []) {
  await ready;
  return db.run(preparedStatement(text, args));
}

async function requireUser(req) {
  const user = await authenticate(req);
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  return user;
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.');
  return user;
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
  if (typeof raw === 'string' && raw.trim()) {
    try { return JSON.parse(raw); } catch { throw new HttpError(400, 'Request body must be valid JSON.'); }
  }
  return {};
}

function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(' ');
    throw new HttpError(400, message || 'Invalid request data.', result.error.issues);
  }
  return result.data;
}

function setSessionCookie(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, jwtSecret(), { algorithm: 'HS256', expiresIn: '7d' });
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `stream_token=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `stream_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

function safeErrorLog(error) {
  const status = Number(error?.status) || 500;
  const known = status < 500;
  const message = known ? String(error.message || 'Request failed').slice(0, 240) : (error?.name || 'InternalError');
  console.error(`[api ${status}] ${message}`);
}

function createHandler(handler, options = {}) {
  const methods = options.methods ? new Set(options.methods) : null;
  return async function apiHandler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', options.cache || 'no-store');
    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', methods ? [...methods, 'OPTIONS'].join(', ') : 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      return res.status(204).end();
    }
    if (methods && !methods.has(req.method)) {
      res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '));
      return json(res, 405, { error: 'Method not allowed.' });
    }
    const rateKey = options.rateKey || 'api';
    const limit = options.rateLimit || 180;
    if (!allowRate(req, rateKey, limit, options.windowMs)) {
      res.setHeader('Retry-After', String(Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)));
      return json(res, 429, { error: 'Too many requests. Please try again shortly.' });
    }
    try {
      await handler(req, res);
    } catch (error) {
      safeErrorLog(error);
      if (error instanceof HttpError || Number.isInteger(error?.status)) {
        const status = Number(error.status) || 400;
        return json(res, status, { error: error.message || 'Request failed.', ...(error.details ? { details: error.details } : {}) });
      }
      if (error?.name === 'ZodError') return json(res, 400, { error: 'Invalid request data.' });
      if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return json(res, 504, { error: 'The upstream service timed out. Please try again.' });
      return json(res, 500, { error: 'Something went wrong. Please try again.' });
    }
  };
}

function requireMethod(req, methods) {
  if (!methods.includes(req.method)) throw new HttpError(405, 'Method not allowed.');
}

function safeHttpUrl(value, options = {}) {
  let url;
  try { url = new URL(String(value)); } catch { return null; }
  if (url.protocol !== 'https:' && !(options.allowHttp && url.protocol === 'http:')) return null;
  if (url.username || url.password) return null;
  return url;
}

const slugSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'Slug can contain letters, numbers, and hyphens only.');

module.exports = {
  HttpError,
  createHandler,
  json,
  query,
  param,
  dbAll,
  dbGet,
  dbRun,
  requireUser,
  requireAdmin,
  parseBody,
  validate,
  setSessionCookie,
  clearSessionCookie,
  requireMethod,
  safeHttpUrl,
  slugSchema,
  z,
  preparedStatement,
};
