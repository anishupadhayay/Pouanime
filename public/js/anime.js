// public/js/anime.js — anime detail, AniList metadata presentation, episodes, and watchlist action
(function () {
  'use strict';
  const api = window.StreamAPI;
  const ui = window.StreamUI;
  if (!api || !ui) return;

  function infoItem(label, value) {
    return `<li><span>${ui.esc(label)}</span><strong>${ui.esc(value || '—')}</strong></li>`;
  }

  async function loadAnime() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) { window.location.replace('/404.html'); return; }
    try {
      const [detail, episodeData] = await Promise.all([
        api.get(`/api/anime/${encodeURIComponent(slug)}`),
        api.get(`/api/anime/${encodeURIComponent(slug)}/episodes`).catch(() => ({ episodes: [] })),
      ]);
      const anime = detail.anime;
      const title = ui.cleanText(anime.title, 250);
      document.title = `${title} — Stream`;
      const banner = ui.safeImage(anime.banner || anime.poster);
      const hero = document.getElementById('detail-hero');
      if (banner) hero.style.setProperty('--detail-banner', `url("${banner.replace(/(["\\])/g, '\\$1')}")`);
      const poster = ui.safeImage(anime.poster);
      const genres = (anime.genres || []).map((genre) => `<a class="chip" href="/genre.html?slug=${encodeURIComponent(genre.slug)}">${ui.esc(genre.name)}</a>`).join('');
      const meta = [ui.formatType(anime.type), anime.year, anime.status, Number(anime.rating) > 0 ? `★ ${Number(anime.rating).toFixed(1)}` : null].filter(Boolean);
      document.getElementById('detail-layout').innerHTML = `<img class="detail-poster" src="${ui.esc(poster)}" alt="${ui.esc(title)} poster" loading="eager" decoding="async"><div class="detail-info"><div class="eyebrow">${ui.esc(anime.status || 'Anime')}</div><h1>${ui.esc(title)}</h1><div class="detail-meta">${meta.map((item, index) => `<span class="${String(item).startsWith('★') ? 'rating' : ''}">${ui.esc(item)}</span>`).join('')}<span>${Number(anime.episode_count) || 0} episodes</span></div><div class="detail-actions"><a class="button" id="start-watching" href="#episodes">▶ Start watching</a><button class="button button-secondary" id="watchlist-button" type="button">＋ Add to watchlist</button></div><div class="genre-cloud" style="margin-top:16px">${genres}</div></div>`;
      document.getElementById('synopsis').textContent = anime.synopsis || 'No synopsis is available for this title yet.';
      document.getElementById('info-list').innerHTML = [
        infoItem('Format', ui.formatType(anime.type)), infoItem('Status', anime.status), infoItem('Year', anime.year),
        infoItem('Season', anime.season ? `${String(anime.season).charAt(0).toUpperCase()}${String(anime.season).slice(1)}` : ''),
        infoItem('Episodes', anime.total_episodes || anime.episode_count), infoItem('Studio', anime.studio),
      ].join('');
      const episodes = episodeData.episodes || [];
      document.getElementById('episode-count').textContent = episodes.length ? `${episodes.length} available` : '';
      const episodeGrid = document.getElementById('episode-grid');
      if (episodes.length) episodeGrid.innerHTML = episodes.map((episode) => `<a class="episode-item" href="/watch.html?episode=${Number(episode.id)}"><strong>Episode ${Number(episode.ep_number)}</strong><small>${ui.esc(episode.title || 'Watch episode')} ${Number(episode.server_count) ? `· ${Number(episode.server_count)} server${Number(episode.server_count) === 1 ? '' : 's'}` : ''}</small></a>`).join('');
      else episodeGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Episodes coming soon</h3><p>Episodes for this anime have not been added yet.</p></div>';
      document.getElementById('watchlist-button').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          await api.post('/api/watchlist', { anime_id: Number(anime.id) }, { auth: true });
          button.textContent = '✓ Added to watchlist';
          ui.showToast('Added to your watchlist.');
        } catch (error) {
          if (error.status !== 401) ui.showToast(error.message || 'Could not update your watchlist.', 'error');
        } finally { button.disabled = false; }
      });
    } catch (error) {
      document.getElementById('detail-layout').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h2>Anime not found</h2><p>${ui.esc(error.message || 'This title is not available.')}</p><a class="button" href="/search.html">Browse anime</a></div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', loadAnime);
})();
