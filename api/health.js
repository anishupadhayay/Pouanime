// api/health.js — lightweight database-backed health check
const { createHandler, json, dbGet } = require('../server/lib/api.js');

module.exports = createHandler(async (req, res) => {
  await dbGet('SELECT 1 AS ok');
  return json(res, 200, { ok: true, service: 'Stream API' });
}, { methods: ['GET'], rateKey: 'health', rateLimit: 60 });
