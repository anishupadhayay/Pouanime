// admin/js/anime.js — AniList-first import, bulk import, manual fallback, and catalogue actions
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const imageUrl = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  let searchTimer;
  let trendingItems = [];
  let popularItems = [];
  let catalogue = [];

  function mediaTitle(item) { return item.title?.english || item.title?.romaji || item.title?.native || `Anime ${item.id}`; }
  function resultCard(item) {
    const poster = imageUrl(item.coverImage?.extraLarge || item.coverImage?.large || '');
    const year = item.startDate?.year || item.seasonYear || 'Year unknown';
    return `<div class="admin-result" role="button" tabindex="0" data-import-id="${Number(item.id)}"><img src="${esc(poster)}" alt="" loading="lazy"><span><h3>${esc(mediaTitle(item))}</h3><p>${esc(year)} · ${esc(item.format || 'ANIME')} · ${item.episodes ? `${Number(item.episodes)} eps` : 'episode count unknown'}</p></span></div>`;
  }
  function showResults(items) {
    const target = document.getElementById('anilist-results');
    target.innerHTML = items.length ? items.map(resultCard).join('') : '<div class="admin-empty" style="grid-column:1/-1">No AniList matches found.</div>';
  }
  async function importOne(id, button) {
    const auto = document.getElementById('auto-episodes').checked;
    if (button) { button.disabled = true; button.style.opacity = '.55'; }
    try {
      const result = await api.post('/api/admin/anime/import', { anilist_id: Number(id), auto_create_episodes: auto });
      api.toast(`Anime imported ✓ ${result.anime.title}`);
      await loadCatalogue();
    } catch (error) { api.toast(error.message || 'Import failed.', true); }
    finally { if (button) { button.disabled = false; button.style.opacity = ''; } }
  }
  function renderCatalogue(filter = '') {
    const query = filter.trim().toLowerCase();
    const rows = catalogue.filter((anime) => !query || String(anime.title).toLowerCase().includes(query));
    document.getElementById('catalogue-rows').innerHTML = rows.length ? rows.map((anime) => `<tr><td><strong>${esc(anime.title)}</strong><div class="admin-subtle">${esc(anime.slug)}</div></td><td>${esc(anime.type || '—')}</td><td>${Number(anime.episode_count || 0)}</td><td>${anime.anilist_id ? '<span class="admin-badge green">AniList</span>' : '<span class="admin-badge">Manual</span>'}</td><td><div class="admin-actions">${anime.anilist_id ? `<button class="admin-button secondary small" data-refresh="${Number(anime.id)}" type="button">Refresh</button>` : ''}<button class="admin-button danger small" data-delete="${Number(anime.id)}" type="button">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="5" class="admin-muted">No matching anime titles.</td></tr>';
    document.querySelectorAll('[data-refresh]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try { await api.post(`/api/admin/anime/${Number(button.dataset.refresh)}/refresh`, {}); api.toast('AniList metadata refreshed.'); await loadCatalogue(); }
      catch (error) { api.toast(error.message, true); }
      finally { button.disabled = false; }
    }));
    document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
      const anime = catalogue.find((item) => Number(item.id) === Number(button.dataset.delete));
      if (!anime || !window.confirm(`Delete “${anime.title}” and all its episodes?`)) return;
      button.disabled = true;
      try { await api.del(`/api/admin/anime/${Number(anime.id)}`); api.toast('Anime removed.'); await loadCatalogue(); }
      catch (error) { api.toast(error.message, true); button.disabled = false; }
    }));
  }
  async function loadCatalogue() {
    try { const data = await api.get('/api/admin/anime'); catalogue = data.results || []; renderCatalogue(document.getElementById('catalogue-filter').value); }
    catch (error) { document.getElementById('catalogue-rows').innerHTML = `<tr><td colspan="5" class="admin-muted">${esc(error.message)}</td></tr>`; }
  }
  function renderBulkList(targetId, items, group) {
    const target = document.getElementById(targetId);
    target.innerHTML = items.length ? items.map((item) => `<div class="admin-list-item admin-inline" style="align-items:flex-start"><input class="admin-check bulk-choice" id="bulk-${group}-${Number(item.id)}" type="checkbox" data-anilist-id="${Number(item.id)}" data-group="${group}"><label for="bulk-${group}-${Number(item.id)}" style="cursor:pointer"><strong>${esc(mediaTitle(item))}</strong><span class="admin-subtle" style="display:block">${esc(item.format || 'ANIME')} · ${item.episodes ? `${Number(item.episodes)} episodes` : 'Episodes unknown'}</span></label></div>`).join('') : '<div class="admin-empty">No titles found.</div>';
  }
  async function loadBulk(type) {
    const targetId = type === 'trending' ? 'bulk-trending-list' : 'bulk-popular-list';
    const target = document.getElementById(targetId);
    target.innerHTML = '<div class="admin-empty">Loading AniList titles…</div>';
    try {
      let items;
      if (type === 'trending') {
        const data = await api.get('/api/anilist/trending?page=1');
        trendingItems = data.results || [];
        items = trendingItems;
      } else {
        const data = await api.get('/api/anilist/popular?page=1');
        popularItems = data.results || [];
        items = popularItems;
      }
      renderBulkList(targetId, items.slice(0, 25), type);
    } catch (error) { target.innerHTML = `<div class="admin-empty">${esc(error.message || 'AniList is unavailable.')}</div>`; }
  }
  function slugify(value) { return String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  function manualPayload(form) {
    const data = new FormData(form);
    const payload = { title: String(data.get('title') || '').trim(), published: data.has('published') };
    const slug = String(data.get('slug') || '').trim();
    if (slug) payload.slug = slug;
    for (const key of ['synopsis', 'poster', 'banner', 'season', 'type', 'status', 'studio']) {
      const value = String(data.get(key) || '').trim();
      if (value) payload[key] = value;
    }
    for (const key of ['year', 'rating', 'total_episodes']) {
      const value = String(data.get(key) || '').trim();
      if (value) payload[key] = Number(value);
    }
    const genres = String(data.get('genres') || '').split(',').map((entry) => entry.trim()).filter(Boolean);
    if (genres.length) payload.genres = genres;
    return payload;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('active', item === tab));
      document.getElementById('tab-import').classList.toggle('admin-hidden', tab.dataset.tab !== 'import');
      document.getElementById('tab-manual').classList.toggle('admin-hidden', tab.dataset.tab !== 'manual');
    }));
    const search = document.getElementById('anilist-search');
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const term = search.value.trim();
      if (term.length < 2) { document.getElementById('anilist-results').innerHTML = ''; document.getElementById('search-status').textContent = 'Type at least two characters to search AniList.'; return; }
      document.getElementById('search-status').textContent = 'Searching AniList…';
      searchTimer = setTimeout(async () => {
        try {
          const data = await api.get(`/api/anilist/search?q=${encodeURIComponent(term)}&page=1`);
          showResults(data.results || []);
          document.getElementById('search-status').textContent = `${(data.results || []).length} results · click a title to import`;
          document.querySelectorAll('[data-import-id]').forEach((button) => {
            const runImport = () => importOne(button.dataset.importId, button);
            button.addEventListener('click', runImport);
            button.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); runImport(); } });
          });
        } catch (error) { document.getElementById('search-status').textContent = error.message || 'AniList search failed.'; }
      }, 400);
    });
    document.getElementById('catalogue-filter').addEventListener('input', (event) => renderCatalogue(event.target.value));
    document.getElementById('manual-title').addEventListener('input', (event) => {
      const slug = document.getElementById('manual-slug');
      if (!slug.dataset.edited) slug.value = slugify(event.target.value);
    });
    document.getElementById('manual-slug').addEventListener('input', (event) => { event.target.dataset.edited = '1'; });
    document.getElementById('manual-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const result = await api.post('/api/admin/anime', manualPayload(event.currentTarget));
        api.toast(`Added ${result.anime.title}.`);
        event.currentTarget.reset();
        document.getElementById('manual-slug').dataset.edited = '';
        await loadCatalogue();
      } catch (error) { api.toast(error.message || 'Could not save anime.', true); }
      finally { button.disabled = false; }
    });
    const modal = document.getElementById('bulk-modal');
    document.getElementById('open-bulk-import').addEventListener('click', () => modal.classList.remove('admin-hidden'));
    document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.closeModal).classList.add('admin-hidden')));
    document.getElementById('load-trending-list').addEventListener('click', () => loadBulk('trending'));
    document.getElementById('load-popular-list').addEventListener('click', () => loadBulk('popular'));
    document.getElementById('import-selected').addEventListener('click', async (event) => {
      const ids = [...new Set(Array.from(document.querySelectorAll('.bulk-choice:checked')).map((checkbox) => Number(checkbox.dataset.anilistId)).filter(Boolean))];
      if (!ids.length) { api.toast('Select at least one title.', true); return; }
      if (ids.length > 50) { api.toast('Select no more than 50 titles at a time.', true); return; }
      const button = event.currentTarget;
      button.disabled = true;
      document.getElementById('bulk-progress-wrap').classList.remove('admin-hidden');
      document.getElementById('bulk-progress').style.width = '18%';
      document.getElementById('bulk-progress-label').textContent = `Importing ${ids.length} selected titles…`;
      let imported = 0;
      const failed = [];
      try {
        for (let start = 0; start < ids.length; start += 5) {
          const chunk = ids.slice(start, start + 5);
          const end = start + chunk.length;
          const progress = Math.round((start / ids.length) * 100);
          document.getElementById('bulk-progress').style.width = `${Math.max(progress, 8)}%`;
          document.getElementById('bulk-progress-label').textContent = `Importing ${start + 1}–${end} of ${ids.length}…`;
          const result = await api.post('/api/admin/anime/bulk-import', { anilist_ids: chunk, auto_create_episodes: document.getElementById('bulk-auto-episodes').checked });
          imported += Number(result.imported || 0);
          failed.push(...(result.failed || []));
          document.getElementById('bulk-progress').style.width = `${Math.round((end / ids.length) * 100)}%`;
          document.getElementById('bulk-progress-label').textContent = `Imported ${end} of ${ids.length} selected titles…`;
        }
        document.getElementById('bulk-progress-label').textContent = `Done · imported ${imported} of ${ids.length}${failed.length ? ` · ${failed.length} unavailable` : ''}.`;
        api.toast(`Imported ${imported} anime.`);
        await loadCatalogue();
      } catch (error) {
        document.getElementById('bulk-progress-label').textContent = `Stopped after ${imported} imports. ${error.message || 'Bulk import failed.'}`;
        api.toast(error.message || 'Bulk import failed.', true);
        await loadCatalogue();
      } finally { button.disabled = false; }
    });
    loadCatalogue();
  });
})();
