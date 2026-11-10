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
  ['GET', '/api/health', require('../routes/health')],
  ['POST', '/api/auth/register', require('../routes/auth/register')],
  ['POST', '/api/auth/login', require('../routes/auth/login')],
  ['GET', '/api/auth/me', require('../routes/auth/me')],
  ['POST', '/api/auth/logout', require('../routes/auth/logout')],
  ['GET', '/api/anilist/search', require('../routes/anilist/search')],
  ['GET', '/api/anilist/trending', require('../routes/anilist/trending')],
  ['GET', '/api/anilist/popular', require('../routes/anilist/popular')],
  ['GET', '/api/anilist/:id', require('../routes/anilist/[id]')],
  ['GET', '/api/anime', require('../routes/anime/index')],
  ['GET', '/api/anime/:slug', require('../routes/anime/[slug]')],
  ['GET', '/api/anime/:slug/episodes', require('../routes/anime/[slug]/episodes')],
  ['GET', '/api/search', require('../routes/search')],
  ['GET', '/api/trending', require('../routes/trending')],
  ['GET', '/api/latest', require('../routes/latest')],
  ['GET', '/api/genres', require('../routes/genres')],
  ['GET', '/api/episode/:id/servers', require('../routes/episode/[id]/servers')],
  ['GET', '/api/settings', require('../routes/settings')],
  ['GET', '/api/watchlist', require('../routes/watchlist')],
  ['POST', '/api/watchlist', require('../routes/watchlist')],
  ['DELETE', '/api/watchlist', require('../routes/watchlist')],
  ['GET', '/api/comments', require('../routes/comments')],
  ['POST', '/api/comments', require('../routes/comments')],
  ['GET', '/api/admin/anime', require('../routes/admin/anime')],
  ['POST', '/api/admin/anime', require('../routes/admin/anime')],
  ['POST', '/api/admin/anime/import', require('../routes/admin/anime/import')],
  ['POST', '/api/admin/anime/bulk-import', require('../routes/admin/anime/bulk-import')],
  ['PATCH', '/api/admin/anime/:id', require('../routes/admin/anime/[id]')],
  ['PUT', '/api/admin/anime/:id', require('../routes/admin/anime/[id]')],
  ['DELETE', '/api/admin/anime/:id', require('../routes/admin/anime/[id]')],
  ['POST', '/api/admin/anime/:id/refresh', require('../routes/admin/anime/[id]/refresh')],
  ['POST', '/api/admin/anime/:id/bulk-servers', require('../routes/admin/anime/[id]/bulk-servers')],
  ['GET', '/api/admin/episode', require('../routes/admin/episode')],
  ['POST', '/api/admin/episode', require('../routes/admin/episode')],
  ['PATCH', '/api/admin/episode/:id', require('../routes/admin/episode/[id]')],
  ['PUT', '/api/admin/episode/:id', require('../routes/admin/episode/[id]')],
  ['DELETE', '/api/admin/episode/:id', require('../routes/admin/episode/[id]')],
  ['GET', '/api/admin/episode/:id/servers', require('../routes/admin/episode/[id]/servers')],
  ['POST', '/api/admin/episode/:id/servers', require('../routes/admin/episode/[id]/servers')],
  ['GET', '/api/admin/genre', require('../routes/admin/genre')],
  ['POST', '/api/admin/genre', require('../routes/admin/genre')],
  ['PATCH', '/api/admin/genre', require('../routes/admin/genre')],
  ['DELETE', '/api/admin/genre', require('../routes/admin/genre')],
  ['GET', '/api/admin/settings', require('../routes/admin/settings')],
  ['PUT', '/api/admin/settings', require('../routes/admin/settings')],
  ['GET', '/api/admin/stats', require('../routes/admin/stats')],
  ['GET', '/api/admin/users', require('../routes/admin/users')],
  ['PATCH', '/api/admin/users', require('../routes/admin/users')],
  ['DELETE', '/api/admin/users', require('../routes/admin/users')],
  ['GET', '/api/admin/comments', require('../routes/admin/comments')],
  ['PATCH', '/api/admin/comments', require('../routes/admin/comments')],
  ['DELETE', '/api/admin/comments', require('../routes/admin/comments')],
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

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Stream is available at http://localhost:${port}`);
  });
}
module.exports = app;
