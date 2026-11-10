// server/index.js — local Express development server for the Vercel API handlers
require('dotenv/config');
const express = require('express');
const path = require('node:path');
const rateLimitModule = require('express-rate-limit');
const app = express();
const rateLimit = rateLimitModule.rateLimit || rateLimitModule;

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const adminDir = path.join(publicDir, 'admin');

app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
}));

const routes = [
  ['GET', '/api/health', require('../api/health')],
  ['POST', '/api/auth/register', require('../api/auth/register')],
  ['POST', '/api/auth/login', require('../api/auth/login')],
  ['GET', '/api/auth/me', require('../api/auth/me')],
  ['POST', '/api/auth/logout', require('../api/auth/logout')],
  ['GET', '/api/anilist/search', require('../api/anilist/search')],
  ['GET', '/api/anilist/trending', require('../api/anilist/trending')],
  ['GET', '/api/anilist/popular', require('../api/anilist/popular')],
  ['GET', '/api/anilist/:id', require('../api/anilist/[id]')],
  ['GET', '/api/anime', require('../api/anime/index')],
  ['GET', '/api/anime/:slug', require('../api/anime/[slug]')],
  ['GET', '/api/anime/:slug/episodes', require('../api/anime/[slug]/episodes')],
  ['GET', '/api/search', require('../api/search')],
  ['GET', '/api/trending', require('../api/trending')],
  ['GET', '/api/latest', require('../api/latest')],
  ['GET', '/api/genres', require('../api/genres')],
  ['GET', '/api/episode/:id/servers', require('../api/episode/[id]/servers')],
  ['GET', '/api/settings', require('../api/settings')],
  ['GET', '/api/watchlist', require('../api/watchlist')],
  ['POST', '/api/watchlist', require('../api/watchlist')],
  ['DELETE', '/api/watchlist', require('../api/watchlist')],
  ['GET', '/api/comments', require('../api/comments')],
  ['POST', '/api/comments', require('../api/comments')],
  ['GET', '/api/admin/anime', require('../api/admin/anime')],
  ['POST', '/api/admin/anime', require('../api/admin/anime')],
  ['POST', '/api/admin/anime/import', require('../api/admin/anime/import')],
  ['POST', '/api/admin/anime/bulk-import', require('../api/admin/anime/bulk-import')],
  ['PATCH', '/api/admin/anime/:id', require('../api/admin/anime/[id]')],
  ['PUT', '/api/admin/anime/:id', require('../api/admin/anime/[id]')],
  ['DELETE', '/api/admin/anime/:id', require('../api/admin/anime/[id]')],
  ['POST', '/api/admin/anime/:id/refresh', require('../api/admin/anime/[id]/refresh')],
  ['POST', '/api/admin/anime/:id/bulk-servers', require('../api/admin/anime/[id]/bulk-servers')],
  ['GET', '/api/admin/episode', require('../api/admin/episode')],
  ['POST', '/api/admin/episode', require('../api/admin/episode')],
  ['PATCH', '/api/admin/episode/:id', require('../api/admin/episode/[id]')],
  ['PUT', '/api/admin/episode/:id', require('../api/admin/episode/[id]')],
  ['DELETE', '/api/admin/episode/:id', require('../api/admin/episode/[id]')],
  ['GET', '/api/admin/episode/:id/servers', require('../api/admin/episode/[id]/servers')],
  ['POST', '/api/admin/episode/:id/servers', require('../api/admin/episode/[id]/servers')],
  ['GET', '/api/admin/genre', require('../api/admin/genre')],
  ['POST', '/api/admin/genre', require('../api/admin/genre')],
  ['PATCH', '/api/admin/genre', require('../api/admin/genre')],
  ['DELETE', '/api/admin/genre', require('../api/admin/genre')],
  ['GET', '/api/admin/settings', require('../api/admin/settings')],
  ['PUT', '/api/admin/settings', require('../api/admin/settings')],
  ['GET', '/api/admin/stats', require('../api/admin/stats')],
  ['GET', '/api/admin/users', require('../api/admin/users')],
  ['PATCH', '/api/admin/users', require('../api/admin/users')],
  ['DELETE', '/api/admin/users', require('../api/admin/users')],
  ['GET', '/api/admin/comments', require('../api/admin/comments')],
  ['PATCH', '/api/admin/comments', require('../api/admin/comments')],
  ['DELETE', '/api/admin/comments', require('../api/admin/comments')],
];
for (const [method, route, handler] of routes) app[method.toLowerCase()](route, handler);

app.get('/admin', (req, res) => res.sendFile(path.join(adminDir, 'index.html')));
app.use('/admin', express.static(adminDir, { index: 'index.html', maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use(express.static(publicDir, { index: 'index.html', maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found.' });
  return res.status(404).sendFile(path.join(publicDir, '404.html'));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Stream is available at http://localhost:${port}`);
});
