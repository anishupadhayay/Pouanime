// api/admin/anime.js — admin catalogue listing, AniList upsert, and complete manual fallback
const {
  createHandler, json, dbAll, dbGet, dbRun, parseBody, requireAdmin, validate,
  HttpError, safeHttpUrl, slugSchema, z,
} = require('../../server/lib/api.js');
const { slugify, importMedia } = require('../../server/lib/catalog');
const { getAnimeById } = require('../../server/lib/anilist');

const manualSchema = z.object({
  title: z.string().trim().min(1).max(250),
  slug: slugSchema.optional(),
  synopsis: z.string().trim().min(1, 'Synopsis is required for manual entries.').max(12000),
  poster: z.string().url().max(2000),
  banner: z.string().url().max(2000).nullable().optional(),
  year: z.coerce.number().int().min(1900).max(2200),
  season: z.string().max(20).nullable().optional(),
  type: z.enum(['TV', 'TV_SHORT', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC']),
  status: z.enum(['Ongoing', 'Completed', 'Upcoming']),
  rating: z.coerce.number().min(0).max(10).nullable().optional(),
  popularity: z.coerce.number().int().min(0).max(100000000).optional(),
  studio: z.string().max(250).nullable().optional(),
  total_episodes: z.coerce.number().int().min(1).max(5000).nullable().optional(),
  published: z.boolean().optional().default(true),
  genres: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
}).strict();

module.exports = createHandler(async (req, res) => {
  await requireAdmin(req);
  if (req.method === 'GET') {
    const results = await dbAll(`SELECT a.*, (SELECT COUNT(*) FROM episodes e WHERE e.anime_id = a.id) AS episode_count
      FROM anime a ORDER BY a.created_at DESC, a.id DESC LIMIT 300`);
    return json(res, 200, { results });
  }
  const body = parseBody(req);
  if (body.anilist_id !== undefined) {
    const input = validate(z.object({
      anilist_id: z.coerce.number().int().positive(),
      auto_create_episodes: z.boolean().optional().default(false),
    }).strict(), body);
    const media = await getAnimeById(input.anilist_id);
    if (!media) throw new HttpError(404, 'Anime was not found on AniList.');
    const anime = await importMedia(media, { autoCreateEpisodes: input.auto_create_episodes });
    return json(res, 201, { anime, imported: true });
  }

  const input = validate(manualSchema, body);
  const slug = input.slug || slugify(input.title);
  if (await dbGet('SELECT id FROM anime WHERE slug = ?', [slug])) throw new HttpError(409, 'That slug is already in use.');
  for (const field of ['poster', 'banner']) {
    if (input[field] && !safeHttpUrl(input[field])) throw new HttpError(400, `${field} must be a secure HTTPS URL.`);
  }
  const result = await dbRun(`INSERT INTO anime (title, slug, synopsis, poster, banner, year, season, type, status, rating, popularity, studio, total_episodes, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    input.title, slug, input.synopsis, input.poster, input.banner ?? null, input.year,
    input.season ?? null, input.type, input.status, input.rating ?? null,
    input.popularity ?? 0, input.studio ?? null, input.total_episodes ?? null, input.published ? 1 : 0,
  ]);
  const id = Number(result.lastInsertRowid);
  for (const nameValue of [...new Set(input.genres || [])]) {
    const name = nameValue.trim();
    const genreSlug = slugify(name);
    await dbRun('INSERT OR IGNORE INTO genres (name, slug) VALUES (?, ?)', [name, genreSlug]);
    const genre = await dbGet('SELECT id FROM genres WHERE name = ?', [name]);
    if (genre) await dbRun('INSERT OR IGNORE INTO anime_genres (anime_id, genre_id) VALUES (?, ?)', [id, genre.id]);
  }
  if (input.total_episodes) {
    const episodeRows = Array.from({ length: Math.min(input.total_episodes, 5000) }, (_, index) => [id, index + 1, `Episode ${index + 1}`]);
    for (let start = 0; start < episodeRows.length; start += 1000) {
      const chunk = episodeRows.slice(start, start + 1000);
      await dbRun(`INSERT OR IGNORE INTO episodes (anime_id, ep_number, title) VALUES ${chunk.map(() => '(?, ?, ?)').join(', ')}`, chunk.flat());
    }
  }
  const anime = await dbGet('SELECT * FROM anime WHERE id = ?', [id]);
  return json(res, 201, { anime, imported: false });
}, { methods: ['GET', 'POST'], rateKey: 'admin', rateLimit: 120 });
