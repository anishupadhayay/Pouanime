// db/schema.js — Drizzle ORM SQLite schema for Stream
const { sql } = require('drizzle-orm');
const {
  sqliteTable, integer, text, real, primaryKey, index, uniqueIndex, check,
} = require('drizzle-orm/sqlite-core');

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  banned: integer('banned').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  roleCheck: check('users_role_check', sql`${table.role} IN ('user', 'admin')`),
  bannedCheck: check('users_banned_check', sql`${table.banned} IN (0, 1)`),
}));

const genres = sqliteTable('genres', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
});

const anime = sqliteTable('anime', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  anilistId: integer('anilist_id').unique(),
  malId: integer('mal_id'),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  synopsis: text('synopsis'),
  poster: text('poster'),
  banner: text('banner'),
  year: integer('year'),
  season: text('season'),
  type: text('type'),
  status: text('status'),
  rating: real('rating'),
  popularity: integer('popularity').notNull().default(0),
  studio: text('studio'),
  totalEpisodes: integer('total_episodes'),
  views: integer('views').notNull().default(0),
  published: integer('published').notNull().default(1),
  importedAt: text('imported_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  slugIndex: index('idx_anime_slug').on(table.slug),
  publishedIndex: index('idx_anime_published').on(table.published),
  anilistIndex: index('idx_anime_anilist').on(table.anilistId),
  popularityIndex: index('idx_anime_popularity').on(table.popularity),
  publishedCheck: check('anime_published_check', sql`${table.published} IN (0, 1)`),
}));

const animeGenres = sqliteTable('anime_genres', {
  animeId: integer('anime_id').notNull().references(() => anime.id, { onDelete: 'cascade' }),
  genreId: integer('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.animeId, table.genreId] }),
}));

const episodes = sqliteTable('episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  animeId: integer('anime_id').notNull().references(() => anime.id, { onDelete: 'cascade' }),
  epNumber: integer('ep_number').notNull(),
  title: text('title'),
  thumbnail: text('thumbnail'),
  releaseDate: text('release_date'),
  views: integer('views').notNull().default(0),
}, (table) => ({
  animeNumber: uniqueIndex('uq_episodes_anime_number').on(table.animeId, table.epNumber),
  animeIndex: index('idx_ep_anime').on(table.animeId),
  viewsIndex: index('idx_ep_views').on(table.views),
}));

const servers = sqliteTable('servers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  episodeId: integer('episode_id').notNull().references(() => episodes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  embedUrl: text('embed_url').notNull(),
}, (table) => ({ episodeIndex: index('idx_servers_episode').on(table.episodeId) }));

const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  approved: integer('approved').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  approvedIndex: index('idx_comments_approved').on(table.approved, table.createdAt),
  approvedCheck: check('comments_approved_check', sql`${table.approved} IN (0, 1)`),
}));

const watchlist = sqliteTable('watchlist', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  animeId: integer('anime_id').notNull().references(() => anime.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.animeId] }),
  userIndex: index('idx_watchlist_user').on(table.userId),
}));

const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

module.exports = { users, genres, anime, animeGenres, episodes, servers, comments, watchlist, settings };
