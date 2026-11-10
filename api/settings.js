// api/settings.js — expose only site-wide, non-secret settings
const { createHandler, json, dbAll } = require('../server/lib/api.js');

const PUBLIC_KEYS = new Set(['site_name', 'site_tagline', 'ads_enabled', 'footer_text', 'contact_email']);
module.exports = createHandler(async (req, res) => {
  const rows = await dbAll('SELECT key, value FROM settings');
  const settings = Object.fromEntries(rows.filter((row) => PUBLIC_KEYS.has(row.key)).map((row) => [row.key, row.value]));
  return json(res, 200, { settings });
}, { methods: ['GET'], cache: 'public, max-age=60, stale-while-revalidate=300' });
