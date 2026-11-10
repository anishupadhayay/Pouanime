-- schema.sql — Stream anime catalogue database
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  banned INTEGER NOT NULL DEFAULT 0 CHECK (banned IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS anime (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anilist_id INTEGER UNIQUE,
  mal_id INTEGER,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  synopsis TEXT,
  poster TEXT,
  banner TEXT,
  year INTEGER,
  season TEXT,
  type TEXT,
  status TEXT,
  rating REAL,
  popularity INTEGER NOT NULL DEFAULT 0,
  studio TEXT,
  total_episodes INTEGER,
  views INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  imported_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anime_genres (
  anime_id INTEGER NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (anime_id, genre_id)
);

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id INTEGER NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  ep_number INTEGER NOT NULL,
  title TEXT,
  thumbnail TEXT,
  release_date TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  UNIQUE(anime_id, ep_number)
);

CREATE TABLE IF NOT EXISTS servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  embed_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, anime_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_anime_slug ON anime(slug);
CREATE INDEX IF NOT EXISTS idx_anime_published ON anime(published);
CREATE INDEX IF NOT EXISTS idx_anime_anilist ON anime(anilist_id);
CREATE INDEX IF NOT EXISTS idx_ep_anime ON episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_ep_views ON episodes(views DESC);
CREATE INDEX IF NOT EXISTS idx_anime_popularity ON anime(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_servers_episode ON servers(episode_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
