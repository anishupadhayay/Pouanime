// db/client.js — shared Turso/libSQL connection and Drizzle instance
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const schema = require('./schema');

const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
const options = { url };
if (process.env.TURSO_AUTH_TOKEN) options.authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(options);
const db = drizzle(client, { schema });
const ready = client.execute('PRAGMA foreign_keys = ON').catch(() => undefined);

module.exports = { client, db, ready };
