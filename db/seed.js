// db/seed.js — create the first administrator, default settings, and trending catalogue
require('dotenv/config');
const bcrypt = require('bcryptjs');
const { client, ready } = require('./client');
const { getTrendingAnime } = require('../server/lib/anilist');
const { importMedia } = require('../server/lib/catalog');

const defaultSettings = {
  site_name: 'Stream',
  site_tagline: 'Your next favorite anime starts here.',
  ads_enabled: 'false',
  footer_text: 'Made for anime fans. Metadata powered by AniList.',
  contact_email: '',
};

async function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before running the seed.');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  await ready;

  const passwordHash = await bcrypt.hash(password, 12);
  await client.execute({
    sql: `INSERT INTO users (email, password_hash, role, banned) VALUES (?, ?, 'admin', 0)
      ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin', banned = 0`,
    args: [email, passwordHash],
  });
  for (const [key, value] of Object.entries(defaultSettings)) {
    await client.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING', args: [key, value] });
  }
  console.log(`Administrator ready: ${email}`);

  const trending = await getTrendingAnime(1);
  const topTen = trending.results.slice(0, 10);
  let imported = 0;
  for (const media of topTen) {
    await importMedia(media, { autoCreateEpisodes: true, fallbackEpisodes: 12 });
    imported += 1;
    console.log(`Imported ${imported}/${topTen.length}: ${media.title?.english || media.title?.romaji || media.id}`);
  }
  console.log(`Seed complete: ${imported} AniList titles are ready.`);
  await client.close();
}

main().catch(async (error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
  try { await client.close(); } catch {}
});
