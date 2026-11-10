// api/anime/[slug].js — public anime detail and associated genres
const { createHandler, json, param, dbAll, dbGet, dbRun, HttpError } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const slug = String(param(req, 'slug') || '').trim().slice(0, 120);
  if (!slug) throw new HttpError(400, 'Anime slug is required.');
  await dbRun('UPDATE anime SET views = views + 1 WHERE slug = ? AND published = 1', [slug]);
  const anime = await dbGet('SELECT * FROM anime WHERE slug = ? AND published = 1', [slug]);
  if (!anime) throw new HttpError(404, 'Anime was not found.');
  anime.genres = await dbAll('SELECT g.id, g.name, g.slug FROM genres g JOIN anime_genres ag ON ag.genre_id = g.id WHERE ag.anime_id = ? ORDER BY g.name', [anime.id]);
  anime.episode_count = Number((await dbGet('SELECT COUNT(*) AS total FROM episodes WHERE anime_id = ?', [anime.id]))?.total || 0);
  return json(res, 200, { anime });
}, { methods: ['GET'], cache: 'no-store' });
