// api/anime/[slug]/episodes.js — list episodes for one published anime
const { createHandler, json, param, dbGet, dbAll, HttpError } = require('../../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const slug = String(param(req, 'slug') || '').trim().slice(0, 120);
  const anime = await dbGet('SELECT id, title, slug, poster, total_episodes FROM anime WHERE slug = ? AND published = 1', [slug]);
  if (!anime) throw new HttpError(404, 'Anime was not found.');
  const episodes = await dbAll(`SELECT e.id, e.anime_id, e.ep_number, e.title, e.thumbnail, e.release_date, e.views,
    (SELECT COUNT(*) FROM servers s WHERE s.episode_id = e.id) AS server_count
    FROM episodes e WHERE e.anime_id = ? ORDER BY e.ep_number ASC`, [anime.id]);
  return json(res, 200, { anime, episodes });
}, { methods: ['GET'], cache: 'public, max-age=15, stale-while-revalidate=60' });
