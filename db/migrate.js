// db/migrate.js — apply schema.sql to the configured libSQL database
require('dotenv/config');
const fs = require('node:fs/promises');
const path = require('node:path');
const { client, ready } = require('./client');

async function main() {
  await ready;
  const schema = await fs.readFile(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) await client.execute(statement);
  console.log(`Applied ${statements.length} schema statements.`);
  await client.close();
}

main().catch(async (error) => {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
  try { await client.close(); } catch {}
});
