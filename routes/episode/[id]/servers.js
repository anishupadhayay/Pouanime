// api/episode/[id]/servers.js — list available embeds for a public episode
const { createHandler, json, param, dbAll, dbGet, dbRun, HttpError } = require('../../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  const id = Number(param(req, 'id'));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Episode ID must be a positive integer.');
  const episode = await dbGet(`SELECT e.id, e.anime_id, e.ep_number, e.title, e.thumbnail, e.release_date,
    a.title AS anime_title, a.slug AS anime_slug, a.poster AS anime_poster
    FROM episodes e JOIN anime a ON a.id = e.anime_id
    WHERE e.id = ? AND a.published = 1`, [id]);
  if (!episode) throw new HttpError(404, 'Episode was not found.');
  await dbRun('UPDATE episodes SET views = views + 1 WHERE id = ?', [id]);
  await dbRun('UPDATE anime SET views = views + 1 WHERE id = ?', [episode.anime_id]);
  const servers = await dbAll('SELECT id, name, embed_url FROM servers WHERE episode_id = ? ORDER BY id', [id]);
  return json(res, 200, { episode, servers });
}, { methods: ['GET'], cache: 'no-store' });
