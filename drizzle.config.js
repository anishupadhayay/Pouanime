// drizzle.config.js — Drizzle Kit configuration for Turso/libSQL
require('dotenv/config');

module.exports = {
  schema: './db/schema.js',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
};
