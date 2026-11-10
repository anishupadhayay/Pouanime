// admin/js/genres.js — create, rename, and delete genres
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let genres = [];
  function render() {
    document.getElementById('genre-total').textContent = String(genres.length);
    document.getElementById('genre-rows').innerHTML = genres.length ? genres.map((genre) => `<tr><td><strong>${esc(genre.name)}</strong></td><td><code>${esc(genre.slug)}</code></td><td>${Number(genre.anime_count || 0)}</td><td><div class="admin-actions"><button class="admin-button secondary small" data-edit-genre="${Number(genre.id)}" type="button">Rename</button><button class="admin-button danger small" data-delete-genre="${Number(genre.id)}" type="button">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="4" class="admin-muted">No genres have been created.</td></tr>';
    document.querySelectorAll('[data-edit-genre]').forEach((button) => button.addEventListener('click', async () => {
      const genre = genres.find((item) => Number(item.id) === Number(button.dataset.editGenre));
      if (!genre) return;
      const name = window.prompt('Genre name', genre.name);
      if (name === null || !name.trim()) return;
      try { await api.patch('/api/admin/genre', { id: Number(genre.id), name: name.trim() }); api.toast('Genre updated.'); await load(); }
      catch (error) { api.toast(error.message, true); }
    }));
    document.querySelectorAll('[data-delete-genre]').forEach((button) => button.addEventListener('click', async () => {
      const genre = genres.find((item) => Number(item.id) === Number(button.dataset.deleteGenre));
      if (!genre || !window.confirm(`Delete genre “${genre.name}”? Titles will remain in the catalogue.`)) return;
      try { await api.del('/api/admin/genre', { id: Number(genre.id) }); api.toast('Genre deleted.'); await load(); }
      catch (error) { api.toast(error.message, true); }
    }));
  }
  async function load() {
    try { const data = await api.get('/api/admin/genre'); genres = data.genres || []; render(); }
    catch (error) { document.getElementById('genre-rows').innerHTML = `<tr><td colspan="4" class="admin-muted">${esc(error.message)}</td></tr>`; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('genre-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = document.getElementById('genre-name').value.trim();
      const slug = document.getElementById('genre-slug').value.trim();
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      try { await api.post('/api/admin/genre', { name, ...(slug ? { slug } : {}) }); api.toast('Genre created.'); event.currentTarget.reset(); await load(); }
      catch (error) { api.toast(error.message, true); }
      finally { button.disabled = false; }
    });
  });
})();
