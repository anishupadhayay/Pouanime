// public/js/search.js — debounced local search and paginated catalogue browsing
(function () {
  'use strict';
  const api = window.StreamAPI;
  const ui = window.StreamUI;
  if (!api || !ui) return;
  const params = new URLSearchParams(window.location.search);
  let term = (params.get('q') || '').trim();
  let page = 1;
  let currentResults = [];
  let hasMore = false;
  let timer;

  async function runSearch(reset = true) {
    if (reset) { page = 1; currentResults = []; }
    term = document.getElementById('search-input').value.trim();
    const grid = document.getElementById('results-grid');
    const empty = document.getElementById('results-empty');
    document.getElementById('results-title').textContent = term ? `Results for “${term.slice(0, 70)}”` : 'Popular anime';
    document.getElementById('results-subtitle').textContent = '';
    empty.classList.add('hidden');
    if (reset) grid.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton-card"><div class="poster-wrap skeleton"></div><div class="loading-line skeleton" style="height:14px;margin-top:11px"></div><div class="loading-line skeleton" style="height:10px;width:62%;margin-top:8px"></div></div>').join('');
    try {
      let data;
      if (term.length >= 2) data = await api.get(`/api/search?q=${encodeURIComponent(term)}&page=${page}`);
      else {
        const sort = document.getElementById('sort-select').value;
        data = await api.get(`/api/anime?sort=${encodeURIComponent(sort)}&page=${page}&limit=48`);
      }
      const items = data.results || [];
      currentResults = reset ? items : currentResults.concat(items);
      hasMore = items.length === 48;
      ui.renderCards(grid, currentResults, { empty: '' });
      if (!currentResults.length) {
        empty.classList.remove('hidden');
        ui.showEmpty(empty, 'No matches yet', 'Try another title or search for a shorter phrase.');
      }
      document.getElementById('load-more').classList.toggle('hidden', !hasMore);
      const url = new URL(window.location.href);
      if (term) url.searchParams.set('q', term); else url.searchParams.delete('q');
      window.history.replaceState({}, '', url);
    } catch (error) {
      empty.classList.remove('hidden');
      ui.showEmpty(empty, 'Search unavailable', error.message || 'Please try again in a moment.');
      document.getElementById('load-more').classList.add('hidden');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    input.value = term;
    form.addEventListener('submit', (event) => { event.preventDefault(); runSearch(); });
    input.addEventListener('input', () => { window.clearTimeout(timer); timer = window.setTimeout(() => runSearch(), 350); });
    document.getElementById('sort-select').addEventListener('change', () => { if (!term) runSearch(); });
    document.getElementById('load-more').addEventListener('click', () => { page += 1; runSearch(false); });
    if (params.get('sort') === 'trending') document.getElementById('sort-select').value = 'popular';
    runSearch();
  });
})();
