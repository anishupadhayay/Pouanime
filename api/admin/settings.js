// api/admin/settings.js — read and update the public site configuration
const { createHandler, json, dbAll, dbGet, dbRun, parseBody, requireAdmin, validate, HttpError, z } = require('../../server/lib/api.js');

const ALLOWED_KEYS = new Set(['site_name', 'site_tagline', 'ads_enabled', 'footer_text', 'contact_email']);
module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const rows = await dbAll('SELECT key, value FROM settings ORDER BY key');
    return json(res, 200, { settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
  }
  const body = parseBody(req);
  const values = body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings) ? body.settings : body;
  const allowedValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (!ALLOWED_KEYS.has(key)) throw new HttpError(400, `Setting "${key}" cannot be changed here.`);
    if (typeof value !== 'string' && typeof value !== 'boolean') throw new HttpError(400, `${key} must be text or a boolean.`);
    const stringValue = String(value).trim();
    if (key === 'contact_email' && stringValue && !z.string().email().safeParse(stringValue).success) throw new HttpError(400, 'Contact email must be a valid email address.');
    if (key === 'ads_enabled' && !['true', 'false'].includes(stringValue.toLowerCase())) throw new HttpError(400, 'Advertising flag must be true or false.');
    allowedValues[key] = stringValue.slice(0, key === 'footer_text' ? 1000 : 500);
  }
  if (!Object.keys(allowedValues).length) throw new HttpError(400, 'Provide at least one setting to update.');
  for (const [key, value] of Object.entries(allowedValues)) {
    await dbRun('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  }
  const settings = await dbAll('SELECT key, value FROM settings ORDER BY key');
  return json(res, 200, { settings: Object.fromEntries(settings.map((row) => [row.key, row.value])) });
}, { methods: ['GET', 'PUT'], rateKey: 'admin', rateLimit: 120 });
