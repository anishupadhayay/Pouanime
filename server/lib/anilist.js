// server/lib/anilist.js — cached AniList GraphQL client (no API key required)
const ANILIST_URL = 'https://graphql.anilist.co';
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large color }
  bannerImage
  genres
  season
  seasonYear
  startDate { year month day }
  averageScore
  meanScore
  popularity
  episodes
  duration
  status
  format
  source
  studios(isMain: true) { nodes { name } }
  trailer { id site }
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function cleanMedia(media) {
  if (!media) return media;
  return {
    ...media,
    description: stripHtml(media.description),
    title: media.title || {},
    format: media.format ? String(media.format).toUpperCase() : null,
    status: mapAniListStatus(media.status),
  };
}

function mapAniListStatus(status) {
  if (status === 'RELEASING') return 'Ongoing';
  if (status === 'FINISHED') return 'Completed';
  if (['NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'].includes(status)) return 'Upcoming';
  return status || null;
}

function cacheKey(query, variables) {
  return `${query}\n${JSON.stringify(variables || {})}`;
}

async function queryAniList(query, variables = {}, options = {}) {
  const key = cacheKey(query, variables);
  const cached = options.bypassCache ? null : cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached || options.bypassCache) cache.delete(key);

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12000),
    });
    if (response.status !== 429 || attempt === 1) break;
    await sleep(2000);
  }

  if (!response) throw new Error('AniList did not return a response.');
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`AniList returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    const apiMessage = payload?.errors?.[0]?.message;
    throw new Error(apiMessage || `AniList request failed (${response.status}).`);
  }
  if (Array.isArray(payload.errors) && payload.errors.length) {
    throw new Error(payload.errors.map((item) => item.message).filter(Boolean).join('; ') || 'AniList GraphQL query failed.');
  }
  if (!payload.data) throw new Error('AniList response did not contain data.');

  cache.set(key, { value: payload.data, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 500) {
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= Date.now()) cache.delete(entryKey);
      if (cache.size <= 400) break;
    }
  }
  return payload.data;
}

async function searchAnime(query, page = 1) {
  const gql = `query ($search: String!, $page: Int!) {
    Page(page: $page, perPage: 25) {
      pageInfo { currentPage hasNextPage total }
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
    }
  }`;
  const data = await queryAniList(gql, { search: String(query).slice(0, 100), page: Math.max(1, Number(page) || 1) });
  return { results: (data.Page?.media || []).map(cleanMedia), pageInfo: data.Page?.pageInfo || null };
}

async function getTrendingAnime(page = 1) {
  const gql = `query ($page: Int!) {
    Page(page: $page, perPage: 25) {
      pageInfo { currentPage hasNextPage total }
      media(type: ANIME, sort: TRENDING_DESC) { ${MEDIA_FIELDS} }
    }
  }`;
  const data = await queryAniList(gql, { page: Math.max(1, Number(page) || 1) });
  return { results: (data.Page?.media || []).map(cleanMedia), pageInfo: data.Page?.pageInfo || null };
}

async function getPopularAnime(page = 1) {
  const gql = `query ($page: Int!) {
    Page(page: $page, perPage: 25) {
      pageInfo { currentPage hasNextPage total }
      media(type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
    }
  }`;
  const data = await queryAniList(gql, { page: Math.max(1, Number(page) || 1) });
  return { results: (data.Page?.media || []).map(cleanMedia), pageInfo: data.Page?.pageInfo || null };
}

async function getAnimeById(anilistId, options = {}) {
  const gql = `query ($id: Int!) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`;
  const data = await queryAniList(gql, { id: Number(anilistId) }, options);
  return cleanMedia(data.Media || null);
}

async function getAnimeByIds(ids) {
  const safeIds = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 50);
  if (!safeIds.length) return [];
  const gql = `query ($ids: [Int]) { Page(page: 1, perPage: 50) { media(id_in: $ids, type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} } } }`;
  const data = await queryAniList(gql, { ids: safeIds });
  return (data.Page?.media || []).map(cleanMedia);
}

module.exports = {
  ANILIST_URL,
  MEDIA_FIELDS,
  queryAniList,
  searchAnime,
  getTrendingAnime,
  getPopularAnime,
  getAnimeById,
  getAnimeByIds,
  mapAniListStatus,
  stripHtml,
};
