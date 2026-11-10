// public/js/watchlist.js — load and remove saved anime
(function () {
  'use strict';
  const api = window.StreamAPI;
  const ui = window.StreamUI;
  if (!api || !ui) return;
  async function load() {
    const grid = document.getElementById('watchlist-grid');
    const empty = document.getElementById('watchlist-empty');
    empty.classList.add('hidden');
    grid.innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton-card"><div class="poster-wrap skeleton"></div><div class="loading-line skeleton" style="height:14px;margin-top:11px"></div></div>').join('');
    try {
      const data = await api.get('/api/watchlist', { auth: true });
      const items = data.results || [];
      if (!items.length) {
        empty.classList.remove('hidden');
        ui.showEmpty(empty, 'Your list is clear', 'Save anime from a title page and they will be waiting here.', '<p style="margin-top:18px"><a class="button" href="/search.html">Explore anime</a></p>');
        return;
      }
      grid.innerHTML = items.map((anime) => `<div class="watchlist-card">${ui.renderAnimeCard(anime)}<button class="button button-ghost button-small remove-watchlist" data-id="${Number(anime.id)}" style="margin-top:8px;width:100%" type="button">Remove</button></div>`).join('');
      ui.bindPosters(grid);
      grid.querySelectorAll('.remove-watchlist').forEach((button) => button.addEventListener('click', async () => {
        button.disabled = true;
        try { await api.del('/api/watchlist', { anime_id: Number(button.dataset.id) }, { auth: true }); ui.showToast('Removed from your watchlist.'); await load(); }
        catch (error) { button.disabled = false; if (error.status !== 401) ui.showToast(error.message, 'error'); }
      }));
    } catch (error) {
      if (error.status !== 401) {
        empty.classList.remove('hidden');
        ui.showEmpty(empty, 'Could not load your list', error.message || 'Please try again.');
      }
    }
  }
  document.addEventListener('DOMContentLoaded', load);
})();
