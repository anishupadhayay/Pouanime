// admin/js/episodes.js — select anime, manage episodes, and add single/bulk server links
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let animeRows = [];
  let selectedAnime = null;
  let selectedEpisode = null;

  function renderAnimeList(filter = '') {
    const list = document.getElementById('anime-list');
    const term = filter.trim().toLowerCase();
    const rows = animeRows.filter((anime) => !term || String(anime.title).toLowerCase().includes(term));
    list.innerHTML = rows.length ? rows.map((anime) => `<button class="admin-list-item" type="button" data-anime-id="${Number(anime.id)}" style="text-align:left;color:inherit;cursor:pointer;border-color:${selectedAnime?.id === anime.id ? 'rgba(255,100,40,.5)' : 'var(--admin-border)'}"><strong>${esc(anime.title)}</strong><div class="admin-subtle">${esc(anime.type || 'Anime')} · ${Number(anime.episode_count || 0)} episodes</div></button>`).join('') : '<div class="admin-empty">No titles found.</div>';
    list.querySelectorAll('[data-anime-id]').forEach((button) => button.addEventListener('click', () => selectAnime(Number(button.dataset.animeId))));
  }

  async function selectAnime(id) {
    selectedAnime = animeRows.find((anime) => Number(anime.id) === id) || null;
    if (!selectedAnime) return;
    document.getElementById('selected-anime-title').textContent = selectedAnime.title;
    document.getElementById('selected-anime-meta').textContent = `${selectedAnime.type || 'Anime'} · ${Number(selectedAnime.year) || 'Year unknown'} · ${Number(selectedAnime.episode_count) || 0} episodes`;
    document.getElementById('add-episode-open').disabled = false;
    document.getElementById('bulk-servers-open').disabled = false;
    renderAnimeList(document.getElementById('anime-filter').value);
    await loadEpisodes();
  }

  async function loadEpisodes() {
    if (!selectedAnime) return;
    const list = document.getElementById('episodes-list');
    const empty = document.getElementById('episodes-empty');
    list.innerHTML = '<div class="admin-empty">Loading episodes…</div>';
    empty.classList.add('admin-hidden');
    try {
      const data = await api.get(`/api/admin/episode?anime_id=${Number(selectedAnime.id)}`);
      const episodes = data.episodes || [];
      if (!episodes.length) {
        list.innerHTML = '';
        empty.textContent = 'No episodes yet. Add one or re-import the title with auto-create episodes enabled.';
        empty.classList.remove('admin-hidden');
        return;
      }
      list.innerHTML = episodes.map((episode) => `<article class="admin-list-item admin-inline" style="justify-content:space-between;align-items:center"><div><strong>Episode ${Number(episode.ep_number)}${episode.title && episode.title !== `Episode ${Number(episode.ep_number)}` ? ` · ${esc(episode.title)}` : ''}</strong><div class="admin-subtle">${Number(episode.views || 0).toLocaleString()} views · ${Number(episode.server_count || 0)} server${Number(episode.server_count) === 1 ? '' : 's'}</div></div><div class="admin-actions"><button class="admin-button secondary small" data-server-episode="${Number(episode.id)}" data-ep-number="${Number(episode.ep_number)}" type="button">${Number(episode.server_count) ? 'Edit servers' : 'Add servers'}</button><button class="admin-button danger small" data-delete-episode="${Number(episode.id)}" type="button">Delete</button></div></article>`).join('');
      list.querySelectorAll('[data-server-episode]').forEach((button) => button.addEventListener('click', () => openServerModal(Number(button.dataset.serverEpisode), Number(button.dataset.epNumber))));
      list.querySelectorAll('[data-delete-episode]').forEach((button) => button.addEventListener('click', async () => {
        if (!window.confirm('Delete this episode and its server links?')) return;
        button.disabled = true;
        try { await api.del(`/api/admin/episode/${Number(button.dataset.deleteEpisode)}`); api.toast('Episode deleted.'); await loadEpisodes(); }
        catch (error) { api.toast(error.message, true); button.disabled = false; }
      }));
    } catch (error) { list.innerHTML = `<div class="admin-empty">${esc(error.message || 'Could not load episodes.')}</div>`; }
  }

  function addServerRow(container, name = '', url = '') {
    const row = document.createElement('div');
    row.className = 'admin-inline server-row';
    row.style.alignItems = 'end';
    row.innerHTML = `<div class="admin-field" style="flex:0 0 145px;margin:0"><label class="admin-label-text">Server name</label><input class="admin-input server-name" maxlength="60" value="${esc(name)}" placeholder="Server 1"></div><div class="admin-field" style="flex:1;margin:0"><label class="admin-label-text">HTTPS embed URL</label><input class="admin-input server-url" maxlength="2000" type="url" value="${esc(url)}" placeholder="https://doodstream.com/e/…"></div><button class="admin-button danger small remove-server-row" type="button" aria-label="Remove server">×</button>`;
    row.querySelector('.remove-server-row').addEventListener('click', () => row.remove());
    container.append(row);
  }

  async function openServerModal(episodeId, epNumber) {
    selectedEpisode = episodeId;
    document.getElementById('server-modal-title').textContent = `Episode ${epNumber} servers`;
    const rows = document.getElementById('server-rows');
    rows.innerHTML = '<div class="admin-empty">Loading saved servers…</div>';
    document.getElementById('server-modal').classList.remove('admin-hidden');
    try {
      const data = await api.get(`/api/admin/episode/${episodeId}/servers`);
      rows.replaceChildren();
      if (data.servers?.length) data.servers.forEach((server) => addServerRow(rows, server.name, server.embed_url));
      else addServerRow(rows, 'Server 1', '');
    } catch (error) {
      rows.replaceChildren();
      addServerRow(rows, 'Server 1', '');
      api.toast(error.message || 'Could not load saved server links.', true);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const data = await api.get('/api/admin/anime');
      animeRows = data.results || [];
      renderAnimeList();
      if (animeRows.length) selectAnime(Number(animeRows[0].id));
      else document.getElementById('anime-list').innerHTML = '<div class="admin-empty">Import an anime before managing episodes.</div>';
    } catch (error) { document.getElementById('anime-list').innerHTML = `<div class="admin-empty">${esc(error.message)}</div>`; }
    document.getElementById('anime-filter').addEventListener('input', (event) => renderAnimeList(event.target.value));
    document.getElementById('add-episode-open').addEventListener('click', () => {
      const nextNumber = document.querySelectorAll('#episodes-list [data-delete-episode]').length + 1;
      document.getElementById('episode-number').value = String(nextNumber);
      document.getElementById('episode-modal').classList.remove('admin-hidden');
    });
    document.getElementById('episode-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!selectedAnime) return;
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      const epNumber = Number(document.getElementById('episode-number').value);
      const title = document.getElementById('episode-title').value.trim();
      const releaseDate = document.getElementById('episode-release').value;
      try {
        await api.post('/api/admin/episode', { anime_id: Number(selectedAnime.id), ep_number: epNumber, ...(title ? { title } : {}), ...(releaseDate ? { release_date: releaseDate } : {}) });
        api.toast(`Episode ${epNumber} added.`);
        event.currentTarget.reset();
        document.getElementById('episode-modal').classList.add('admin-hidden');
        await loadEpisodes();
      } catch (error) { api.toast(error.message || 'Could not add episode.', true); }
      finally { button.disabled = false; }
    });
    document.getElementById('add-server-row').addEventListener('click', () => addServerRow(document.getElementById('server-rows'), `Server ${document.querySelectorAll('#server-rows .server-row').length + 1}`, ''));
    document.getElementById('save-servers').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const servers = Array.from(document.querySelectorAll('#server-rows .server-row')).map((row) => ({ name: row.querySelector('.server-name').value.trim(), embed_url: row.querySelector('.server-url').value.trim() })).filter((server) => server.name && server.embed_url);
      button.disabled = true;
      try {
        await api.post(`/api/admin/episode/${Number(selectedEpisode)}/servers`, { servers });
        api.toast('Episode servers saved.');
        document.getElementById('server-modal').classList.add('admin-hidden');
        await loadEpisodes();
      } catch (error) { api.toast(error.message || 'Could not save servers.', true); }
      finally { button.disabled = false; }
    });
    document.getElementById('bulk-servers-open').addEventListener('click', () => {
      if (!selectedAnime) return;
      const rows = document.getElementById('bulk-server-rows');
      rows.replaceChildren();
      addServerRow(rows, 'Doodstream', 'https://doodstream.com/e/{ep}');
      document.getElementById('bulk-servers-modal').classList.remove('admin-hidden');
    });
    document.getElementById('bulk-add-server-row').addEventListener('click', () => addServerRow(document.getElementById('bulk-server-rows'), `Server ${document.querySelectorAll('#bulk-server-rows .server-row').length + 1}`, ''));
    document.getElementById('save-bulk-servers').addEventListener('click', async (event) => {
      if (!selectedAnime) return;
      const button = event.currentTarget;
      const servers = Array.from(document.querySelectorAll('#bulk-server-rows .server-row')).map((row) => ({ name: row.querySelector('.server-name').value.trim(), embed_url: row.querySelector('.server-url').value.trim() })).filter((server) => server.name && server.embed_url);
      button.disabled = true;
      try {
        const result = await api.post(`/api/admin/anime/${Number(selectedAnime.id)}/bulk-servers`, { servers, replace_existing: document.getElementById('bulk-replace').checked });
        api.toast(`Added ${result.servers_created} server links to ${result.episodes_updated} episodes.`);
        document.getElementById('bulk-servers-modal').classList.add('admin-hidden');
        await loadEpisodes();
      } catch (error) { api.toast(error.message || 'Could not add server links.', true); }
      finally { button.disabled = false; }
    });
    document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.closeModal).classList.add('admin-hidden')));
  });
})();
