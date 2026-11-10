// public/js/ui.js — shared rendering helpers, header behavior, and feedback UI
(function () {
  'use strict';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  function safeImage(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return url.protocol === 'https:' ? url.href : '';
    } catch { return ''; }
  }

  function cleanText(value, max = 500) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  }

  function formatType(type) {
    const names = { TV: 'TV', TV_SHORT: 'TV short', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', MUSIC: 'Music' };
    return names[String(type || '').toUpperCase()] || (type ? String(type).replaceAll('_', ' ') : 'Anime');
  }

  function renderAnimeCard(anime, options = {}) {
    const title = cleanText(anime.title, 250) || 'Untitled anime';
    const poster = safeImage(anime.poster);
    const slug = encodeURIComponent(String(anime.slug || ''));
    const year = Number(anime.year) || '';
    const type = formatType(anime.type);
    const rating = Number(anime.rating) > 0 ? `<span class="card-rating">★ ${esc(Number(anime.rating).toFixed(1))}</span>` : '';
    const badge = options.badge ? `<span class="card-badge hot">${esc(options.badge)}</span>` : '';
    const image = poster
      ? `<img class="poster-image poster-blur" src="${esc(poster)}" alt="${esc(title)} poster" loading="lazy" decoding="async">`
      : `<div class="poster-image" role="img" aria-label="Poster unavailable"></div>`;
    return `<article class="anime-card"><a href="/anime.html?slug=${slug}" aria-label="View ${esc(title)}">
      <div class="poster-wrap">${image}<span class="card-gradient"></span>${badge}${rating}<span class="card-hover"><span class="play-circle"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.7c0-.9 1-1.4 1.7-.9l10 6.1a1.3 1.3 0 0 1 0 2.2l-10 6.1c-.8.5-1.7 0-1.7-.9z"/></svg></span></span></div>
      <h3 class="card-title">${esc(title)}</h3><div class="card-subtitle"><span>${esc(type)}</span>${year ? `<span>${esc(year)}</span>` : ''}</div></a></article>`;
  }

  function bindPosters(container) {
    if (!container) return;
    container.querySelectorAll('img.poster-blur').forEach((image) => {
      const clearBlur = () => image.classList.remove('poster-blur');
      if (image.complete) {
        if (image.naturalWidth) clearBlur(); else image.remove();
      } else {
        image.addEventListener('load', clearBlur, { once: true });
        image.addEventListener('error', () => image.remove(), { once: true });
      }
    });
  }

  function renderCards(container, items, options = {}) {
    if (!container) return;
    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = options.empty !== undefined ? options.empty : '<div class="empty-state" style="grid-column:1/-1">No anime to show yet. Check back soon.</div>';
      return;
    }
    container.innerHTML = items.map((item) => renderAnimeCard(item, options)).join('');
    bindPosters(container);
  }

  function showToast(message, type = 'success') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = cleanText(message, 300);
    region.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  function showEmpty(container, title, copy, action) {
    if (!container) return;
    container.innerHTML = `<h3>${esc(title)}</h3><p>${esc(copy)}</p>${action || ''}`;
  }

  function setupHeader() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('main-nav');
    if (toggle && nav) toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    const userLink = document.getElementById('user-link');
    if (!userLink || !window.StreamAPI) return;
    window.StreamAPI.get('/api/auth/me').then(({ user }) => {
      userLink.textContent = 'My account';
      userLink.href = user.role === 'admin' ? '/admin/dashboard.html' : '/watchlist.html';
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.className = 'button button-ghost button-small';
      logout.textContent = 'Sign out';
      logout.addEventListener('click', async () => {
        try { await window.StreamAPI.post('/api/auth/logout', {}); window.location.assign('/'); }
        catch { showToast('Could not sign out. Please try again.', 'error'); }
      });
      userLink.insertAdjacentElement('afterend', logout);
    }).catch(() => {});
  }

  async function setupFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    let footerText = 'Made for anime fans. Metadata powered by AniList.';
    let siteName = 'Stream';
    window.StreamSettings = {};
    try {
      const data = await window.StreamAPI.get('/api/settings');
      window.StreamSettings = data.settings || {};
      footerText = cleanText(data.settings?.footer_text || footerText, 300);
      siteName = cleanText(data.settings?.site_name || 'Stream', 80);
      document.querySelectorAll('.brand span:last-child').forEach((node) => {
        node.textContent = `${siteName}.`;
      });
      document.title = document.title.replace(/^Stream/, siteName);
    } catch {}
    footer.innerHTML = `<div class="container footer-inner"><div><a class="brand" href="/"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.7c0-.9 1-1.4 1.7-.9l10 6.1a1.3 1.3 0 0 1 0 2.2l-10 6.1c-.8.5-1.7 0-1.7-.9z"/></svg></span><span>${esc(siteName)}<em>.</em></span></a><p style="margin:10px 0 0">${esc(footerText)}</p></div><nav class="footer-nav" aria-label="Footer"><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a><a href="/dmca.html">Copyright</a></nav><span>© ${new Date().getFullYear()} ${esc(siteName)}</span></div>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    setupFooter();
  });
  window.StreamUI = { esc, cleanText, safeImage, formatType, renderAnimeCard, renderCards, bindPosters, showToast, showEmpty };
})();
