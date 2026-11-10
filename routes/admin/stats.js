// api/admin/stats.js — dashboard catalogue and activity totals
const { createHandler, json, dbGet, dbAll, requireAdmin } = require('../../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  const [anime, episodes, users, comments, views, pendingComments, latest] = await Promise.all([
    dbGet('SELECT COUNT(*) AS total FROM anime'),
    dbGet('SELECT COUNT(*) AS total FROM episodes'),
    dbGet('SELECT COUNT(*) AS total FROM users'),
    dbGet('SELECT COUNT(*) AS total FROM comments'),
    dbGet('SELECT COALESCE(SUM(views), 0) AS total FROM anime'),
    dbGet('SELECT COUNT(*) AS total FROM comments WHERE approved = 0'),
    dbAll('SELECT id, title, slug, poster, popularity, created_at FROM anime ORDER BY created_at DESC LIMIT 5'),
  ]);
  return json(res, 200, {
    stats: {
      anime: Number(anime?.total || 0), episodes: Number(episodes?.total || 0), users: Number(users?.total || 0),
      comments: Number(comments?.total || 0), views: Number(views?.total || 0), pending_comments: Number(pendingComments?.total || 0),
    },
    latest,
  });
}, { methods: ['GET'], rateKey: 'admin', rateLimit: 120 });
