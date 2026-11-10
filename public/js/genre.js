// public/js/genre.js — genre links and selected-genre catalogue results
(function () {
  'use strict';
  const api = window.StreamAPI;
  const ui = window.StreamUI;
  if (!api || !ui) return;
  async function load() {
    const cloud = document.getElementById('genre-cloud');
    const selected = new URLSearchParams(window.location.search).get('slug');
    cloud.innerHTML = Array.from({ length: 8 }, () => '<span class="skeleton" style="width:94px;height:39px;border-radius:12px"></span>').join('');
    try {
      const data = await api.get('/api/genres');
      const genres = data.genres || [];
      cloud.innerHTML = genres.length ? genres.map((genre) => `<a class="genre-pill ${genre.slug === selected ? 'active' : ''}" href="/genre.html?slug=${encodeURIComponent(genre.slug)}">${ui.esc(genre.name)} <span class="muted">${Number(genre.anime_count) || 0}</span></a>`).join('') : '<div class="empty-state" style="width:100%"><h3>No genres yet</h3><p>Genres appear as anime is imported from AniList.</p></div>';
      if (selected) {
        const genre = genres.find((item) => item.slug === selected);
        if (!genre) throw new Error('That genre was not found.');
        document.title = `${genre.name} anime — Stream`;
        document.getElementById('genre-title').textContent = `${genre.name} anime`;
        document.getElementById('genre-description').textContent = `${Number(genre.anime_count) || 0} titles in this genre.`;
        document.getElementById('selected-genre-name').textContent = genre.name;
        document.getElementById('genre-results-section').classList.remove('hidden');
        document.getElementById('genre-results').innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton-card"><div class="poster-wrap skeleton"></div><div class="loading-line skeleton" style="height:14px;margin-top:11px"></div></div>').join('');
        const results = await api.get(`/api/anime?genre=${encodeURIComponent(selected)}&limit=48`);
        ui.renderCards(document.getElementById('genre-results'), results.results || []);
      }
    } catch (error) {
      cloud.innerHTML = `<div class="empty-state" style="width:100%"><h3>Genres unavailable</h3><p>${ui.esc(error.message || 'Please try again later.')}</p></div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', load);
})();
