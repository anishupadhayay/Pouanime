// server/lib/catalog.js — map AniList media into the local anime catalogue
const { client, ready } = require('../../db/client');
const { stripHtml, mapAniListStatus } = require('./anilist');

function slugify(value) {
  return String(value || 'anime')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'anime';
}

function mediaToRecord(media) {
  const title = media?.title?.english || media?.title?.romaji || media?.title?.native || `Anime ${media?.id || ''}`;
  const episodeCount = Number(media?.episodes);
  const score = Number(media?.averageScore || media?.meanScore);
  const studios = (media?.studios?.nodes || []).map((studio) => studio.name).filter(Boolean);
  const year = Number(media?.startDate?.year || media?.seasonYear) || null;
  return {
    anilist_id: Number(media.id),
    mal_id: Number(media.idMal) || null,
    title: String(title).slice(0, 250),
    slug: `${slugify(title)}-${Number(media.id)}`,
    synopsis: stripHtml(media.description).slice(0, 12000) || null,
    poster: media.coverImage?.extraLarge || media.coverImage?.large || null,
    banner: media.bannerImage || null,
    year,
    season: media.season ? String(media.season).toLowerCase() : null,
    type: media.format ? String(media.format).toUpperCase() : null,
    status: mapAniListStatus(media.status),
    rating: Number.isFinite(score) && score > 0 ? Math.round((score / 10) * 10) / 10 : null,
    popularity: Number(media.popularity) || 0,
    studio: studios.join(', ').slice(0, 250) || null,
    total_episodes: Number.isInteger(episodeCount) && episodeCount > 0 ? episodeCount : null,
  };
}

async function importMediaList(mediaList, options = {}) {
  await ready;
  const unique = new Map();
  for (const media of mediaList || []) {
    if (media && Number.isInteger(Number(media.id)) && Number(media.id) > 0) unique.set(Number(media.id), media);
  }
  const media = [...unique.values()];
  if (!media.length) return [];
  const records = media.map(mediaToRecord);
  const fieldNames = Object.keys(records[0]);
  const animeStatements = records.map((record) => ({
    sql: `INSERT INTO anime (${fieldNames.join(', ')}, published, imported_at)
      VALUES (${fieldNames.map(() => '?').join(', ')}, 1, datetime('now'))
      ON CONFLICT(anilist_id) DO UPDATE SET ${fieldNames.filter((field) => field !== 'anilist_id').map((field) => `${field} = excluded.${field}`).join(', ')}, imported_at = datetime('now')
      RETURNING *`,
    args: fieldNames.map((field) => record[field]),
  }));
  const animeResults = await client.batch(animeStatements, 'write');
  const animeRows = animeResults.map((result) => result.rows?.[0] ? { ...result.rows[0] } : null);
  if (animeRows.some((row) => !row)) throw new Error('The database did not return the imported anime records.');
  const animeByAniList = new Map(animeRows.map((row) => [Number(row.anilist_id), row]));

  const genreByAniList = new Map();
  const genreNames = new Map();
  for (const item of media) {
    const names = [...new Set((Array.isArray(item.genres) ? item.genres : [])
      .filter((name) => typeof name === 'string' && name.trim())
      .map((name) => name.trim().slice(0, 80)))];
    genreByAniList.set(Number(item.id), names);
    for (const name of names) genreNames.set(name, slugify(name));
  }
  const names = [...genreNames.keys()];
  if (names.length) {
    const values = names.map(() => '(?, ?)').join(', ');
    const args = names.flatMap((name) => [name, genreNames.get(name)]);
    await client.execute({ sql: `INSERT OR IGNORE INTO genres (name, slug) VALUES ${values}`, args });
    const genresResult = await client.execute({
      sql: `SELECT id, name FROM genres WHERE name IN (${names.map(() => '?').join(', ')})`,
      args: names,
    });
    const genreIds = new Map(genresResult.rows.map((row) => [row.name, Number(row.id)]));
    const deletes = animeRows.map((row) => ({ sql: 'DELETE FROM anime_genres WHERE anime_id = ?', args: [row.id] }));
    if (deletes.length) await client.batch(deletes, 'write');
    const links = [];
    for (const item of media) {
      const animeRow = animeByAniList.get(Number(item.id));
      for (const name of genreByAniList.get(Number(item.id)) || []) {
        const genreId = genreIds.get(name);
        if (genreId) links.push([animeRow.id, genreId]);
      }
    }
    for (let start = 0; start < links.length; start += 1000) {
      const chunk = links.slice(start, start + 1000);
      await client.execute({
        sql: `INSERT OR IGNORE INTO anime_genres (anime_id, genre_id) VALUES ${chunk.map(() => '(?, ?)').join(', ')}`,
        args: chunk.flat(),
      });
    }
  } else {
    const deletes = animeRows.map((row) => ({ sql: 'DELETE FROM anime_genres WHERE anime_id = ?', args: [row.id] }));
    if (deletes.length) await client.batch(deletes, 'write');
  }

  if (options.autoCreateEpisodes) {
    const episodes = [];
    for (const row of animeRows) {
      const isMovie = String(row.type || '').toUpperCase() === 'MOVIE';
      const fallbackCount = isMovie ? 1 : (Number(options.fallbackEpisodes) || 12);
      const requestedCount = Number(row.total_episodes) || fallbackCount;
      const count = Math.max(1, Math.min(requestedCount, 5000));
      for (let number = 1; number <= count; number += 1) episodes.push([row.id, number, `Episode ${number}`]);
    }
    for (let start = 0; start < episodes.length; start += 1000) {
      const chunk = episodes.slice(start, start + 1000);
      await client.execute({
        sql: `INSERT OR IGNORE INTO episodes (anime_id, ep_number, title) VALUES ${chunk.map(() => '(?, ?, ?)').join(', ')}`,
        args: chunk.flat(),
      });
    }
  }
  return animeRows;
}

async function importMedia(media, options = {}) {
  const rows = await importMediaList([media], options);
  if (!rows[0]) throw new Error('AniList did not return valid anime metadata.');
  return rows[0];
}

module.exports = { slugify, mediaToRecord, importMedia, importMediaList };
