// admin/js/dashboard.js — dashboard metrics and one-click trending catalogue import
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  async function loadDashboard() {
    try {
      const data = await api.get('/api/admin/stats');
      const stats = data.stats || {};
      const cards = [
        ['Anime titles', stats.anime, 'Published and draft titles'],
        ['Episodes', stats.episodes, 'With or without a video server'],
        ['Registered users', stats.users, `${Number(stats.views) || 0} catalogue views`],
        ['Pending comments', stats.pending_comments, `${Number(stats.comments) || 0} total comments`],
      ];
      document.getElementById('stats-grid').innerHTML = cards.map(([label, value, foot]) => `<div class="admin-stat"><div class="admin-stat-label">${esc(label)}</div><div class="admin-stat-value">${Number(value || 0).toLocaleString()}</div><div class="admin-stat-foot">${esc(foot)}</div></div>`).join('');
      const rows = data.latest || [];
      document.getElementById('latest-anime').innerHTML = rows.length ? rows.map((anime) => `<tr><td><strong>${esc(anime.title)}</strong></td><td>${Number(anime.popularity || 0).toLocaleString()}</td><td>${esc(String(anime.created_at || '').slice(0, 10))}</td></tr>`).join('') : '<tr><td colspan="3" class="admin-muted">No titles yet. Import trending anime to get started.</td></tr>';
    } catch (error) { api.toast(error.message || 'Could not load dashboard.', true); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    document.getElementById('import-trending').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const wrap = document.getElementById('import-progress-wrap');
      const bar = document.getElementById('import-progress');
      const label = document.getElementById('import-progress-label');
      wrap.classList.remove('admin-hidden');
      bar.style.width = '8%';
      label.textContent = 'Fetching trending titles from AniList…';
      try {
        const trending = await api.get('/api/anilist/trending?page=1');
        const ids = (trending.results || []).slice(0, 10).map((anime) => Number(anime.id)).filter(Boolean);
        if (!ids.length) throw new Error('AniList did not return trending titles.');
        let imported = 0;
        const failed = [];
        for (let start = 0; start < ids.length; start += 5) {
          const chunk = ids.slice(start, start + 5);
          label.textContent = `Importing ${start + 1}–${start + chunk.length} of ${ids.length} and creating episodes…`;
          bar.style.width = `${Math.round(25 + (start / ids.length) * 70)}%`;
          const result = await api.post('/api/admin/anime/bulk-import', { anilist_ids: chunk, auto_create_episodes: true });
          imported += Number(result.imported || 0);
          failed.push(...(result.failed || []));
        }
        bar.style.width = '100%';
        label.textContent = `Imported ${imported} of ${ids.length} titles${failed.length ? ` · ${failed.length} unavailable` : ''}.`;
        api.toast(`Imported ${imported} trending anime.`);
        await loadDashboard();
      } catch (error) {
        label.textContent = error.message || 'Import failed. Please try again.';
        api.toast(error.message || 'Import failed.', true);
      } finally { button.disabled = false; }
    });
  });
})();
