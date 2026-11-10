// public/js/home.js — home hero, catalogue rows, latest episodes, and genre chips
(function () {
  'use strict';
  const api = window.StreamAPI;
  const ui = window.StreamUI;
  if (!api || !ui) return;

  function loadingCards(container, count = 6) {
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () => '<div class="skeleton-card"><div class="poster-wrap skeleton"></div><div class="loading-line skeleton" style="height:14px;margin-top:11px"></div><div class="loading-line skeleton" style="height:10px;width:62%;margin-top:8px"></div></div>').join('');
  }

  function renderHero(hero, anime, index, total) {
    const title = ui.cleanText(anime.title || 'Discover anime', 250);
    const banner = ui.safeImage(anime.banner || anime.poster);
    const safeBackground = banner ? `url("${banner.replace(/(["\\])/g, '\\$1')}")` : 'linear-gradient(135deg,#30202a,#14141c)';
    hero.style.setProperty('--hero-image', safeBackground);
    const synopsis = ui.cleanText(anime.synopsis || 'A new story is waiting. Explore the catalogue and find your next favorite anime.', 900);
    const meta = [ui.formatType(anime.type), anime.year, anime.status, Number(anime.rating) > 0 ? `★ ${Number(anime.rating).toFixed(1)}` : null].filter(Boolean);
    hero.innerHTML = `<div class="hero-content"><div class="hero-kicker">Featured title ${total > 1 ? `· ${index + 1} of ${total}` : ''}</div><h1>${ui.esc(title)}</h1><p class="hero-copy">${ui.esc(synopsis)}</p><div class="hero-meta">${meta.map((item) => `<span>${ui.esc(item)}</span>`).join('')}</div><div class="hero-actions"><a class="button" href="/anime.html?slug=${encodeURIComponent(anime.slug || '')}"><span aria-hidden="true">▶</span> Explore anime</a><a class="button button-secondary" href="/search.html">Browse catalogue</a></div></div>${total > 1 ? `<div class="hero-controls" aria-label="Featured anime slides">${Array.from({ length: total }, (_, dot) => `<button class="hero-dot ${dot === index ? 'active' : ''}" data-slide="${dot}" aria-label="Show featured title ${dot + 1}"></button>`).join('')}</div>` : ''}`;
    hero.querySelectorAll('[data-slide]').forEach((button) => button.addEventListener('click', () => setHero(Number(button.dataset.slide))));
  }

  let heroItems = [];
  let heroIndex = 0;
  function setHero(index) {
    const hero = document.getElementById('hero');
    if (!heroItems.length || !hero) return;
    heroIndex = (index + heroItems.length) % heroItems.length;
    renderHero(hero, heroItems[heroIndex], heroIndex, heroItems.length);
  }

  function renderLatest(rows) {
    const list = document.getElementById('latest-list');
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state"><h3>Episodes are on the way</h3><p>Newly added episodes will appear here.</p></div>';
      return;
    }
    list.innerHTML = rows.slice(0, 8).map((item) => {
      const image = ui.safeImage(item.thumbnail || item.poster);
      const title = ui.cleanText(item.anime_title, 250);
      const ep = Number(item.ep_number);
      return `<a class="latest-row" href="/watch.html?episode=${Number(item.episode_id)}"><img class="latest-thumb" src="${ui.esc(image)}" alt="" loading="lazy" decoding="async"><div><strong>${ui.esc(title)}</strong><div class="card-subtitle"><span>Episode ${Number.isFinite(ep) ? ep : ''}</span><span>${ui.esc(ui.formatType(item.type))}</span></div></div><span class="button button-ghost button-small">Watch</span></a>`;
    }).join('');
  }

  async function load() {
    loadingCards(document.getElementById('trending-grid'), 6);
    loadingCards(document.getElementById('popular-grid'), 6);
    const latestList = document.getElementById('latest-list');
    latestList.innerHTML = Array.from({ length: 4 }, () => '<div class="latest-row"><div class="latest-thumb skeleton"></div><div><div class="loading-line skeleton" style="width:72%;height:14px"></div><div class="loading-line skeleton" style="width:48%;height:10px;margin-top:9px"></div></div></div>').join('');
    const tasks = [
      api.get('/api/trending?limit=15').then((data) => {
        const items = data.results || [];
        ui.renderCards(document.getElementById('trending-grid'), items.slice(0, 12), { badge: 'TRENDING' });
        heroItems = items.slice(0, 5);
        if (heroItems.length) {
          setHero(0);
          if (heroItems.length > 1) window.setInterval(() => setHero(heroIndex + 1), 8500);
        } else {
          const hero = document.getElementById('hero');
          const tagline = ui.esc(window.StreamSettings?.site_tagline || 'Your watchlist, fresh episodes, and anime discoveries all in one place.');
          hero.innerHTML = `<div class="hero-content"><div class="hero-kicker">Welcome to Stream</div><h1>Find your next favorite anime.</h1><p class="hero-copy">${tagline}</p><div class="hero-actions"><a class="button" href="/search.html">Explore the catalogue</a></div></div>`;
        }
      }).catch(() => { ui.renderCards(document.getElementById('trending-grid'), []); }),
      api.get('/api/latest?limit=12').then((data) => renderLatest(data.results || [])).catch(() => renderLatest([])),
      (async () => {
        const now = new Date();
        const seasons = ['winter', 'spring', 'summer', 'fall'];
        const season = seasons[Math.floor(now.getMonth() / 3)];
        let data = await api.get(`/api/anime?sort=popular&year=${now.getFullYear()}&season=${season}&limit=12`);
        if (!data.results?.length) data = await api.get('/api/anime?sort=popular&limit=12');
        ui.renderCards(document.getElementById('popular-grid'), data.results || []);
      })().catch(() => ui.renderCards(document.getElementById('popular-grid'), [])),
      api.get('/api/genres').then((data) => {
        const cloud = document.getElementById('genre-cloud');
        const genres = data.genres || [];
        cloud.innerHTML = genres.length ? genres.slice(0, 18).map((genre) => `<a class="genre-pill" href="/genre.html?slug=${encodeURIComponent(genre.slug)}">${ui.esc(genre.name)} <span class="muted">${Number(genre.anime_count) || 0}</span></a>`).join('') : '<span class="muted">Genres appear after the first AniList import.</span>';
      }).catch(() => {})
    ];
    await Promise.allSettled(tasks);
  }
  document.addEventListener('DOMContentLoaded', load);
})();
