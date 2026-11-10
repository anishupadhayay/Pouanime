// public/js/watch.js — render episode details and safe third-party embed servers
(function () {
  'use strict';
  const api = window.StreamAPI;
  const ui = window.StreamUI;
  if (!api || !ui) return;
  const allowedHosts = ['streamtape.com','streamtape.to','streamta.pe','streamtape.cc','doodstream.com','dood.to','dood.watch','dood.wf','dood.pm','dood.re','dood.la','dood.li','do7go.com','mixdrop.co','mixdrop.to','mixdrop.sx','mixdrop.ag','mixdrop.is','mixdrop.ch','youtube.com','youtube-nocookie.com','youtu.be'];
  function safeEmbed(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowedHosts.some((entry) => host === entry || host.endsWith(`.${entry}`))) return '';
      return url.href;
    } catch { return ''; }
  }
  function renderPlayer(server) {
    const frame = document.getElementById('video-frame');
    const url = safeEmbed(server?.embed_url);
    if (!url) {
      frame.innerHTML = '<div class="player-placeholder"><div><strong>Video unavailable</strong><p>The selected server could not be opened safely.</p></div></div>';
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = `${ui.cleanText(server.name, 60)} video player`;
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
  }

  async function loadComments(episodeId) {
    const list = document.getElementById('comments-list');
    try {
      const data = await api.get(`/api/comments?episode_id=${episodeId}`);
      if (!data.comments?.length) { list.innerHTML = '<p class="muted">No comments yet. Be the first to share a thought.</p>'; return; }
      list.innerHTML = data.comments.map((comment) => `<article class="episode-comment"><strong>${ui.esc(comment.author || 'Anime fan')}</strong><p>${ui.esc(comment.text)}</p><small>${ui.esc(comment.created_at || '')}</small></article>`).join('');
    } catch { list.innerHTML = '<p class="muted">Comments are temporarily unavailable.</p>'; }
  }

  async function load() {
    const episodeId = Number(new URLSearchParams(window.location.search).get('episode'));
    if (!Number.isInteger(episodeId) || episodeId < 1) { window.location.replace('/404.html'); return; }
    try {
      const data = await api.get(`/api/episode/${episodeId}/servers`);
      const { episode, servers } = data;
      const title = ui.cleanText(episode.anime_title, 250);
      document.title = `Episode ${Number(episode.ep_number)} · ${title} — Stream`;
      document.getElementById('watch-title').textContent = `${title} · Episode ${Number(episode.ep_number)}${episode.title ? ` — ${ui.cleanText(episode.title, 250)}` : ''}`;
      document.getElementById('back-to-anime').href = `/anime.html?slug=${encodeURIComponent(episode.anime_slug)}`;
      const poster = ui.safeImage(episode.anime_poster);
      document.getElementById('watch-aside').innerHTML = `${poster ? `<img class="detail-poster" src="${ui.esc(poster)}" alt="${ui.esc(title)} poster" loading="lazy">` : '<div class="detail-poster"></div>'}<div><h2 style="font-size:1.12rem;margin:0 0 4px">${ui.esc(title)}</h2><p class="muted" style="margin:0">Episode ${Number(episode.ep_number)}</p></div><a class="button button-secondary" href="/anime.html?slug=${encodeURIComponent(episode.anime_slug)}">View anime</a>`;
      const list = document.getElementById('server-list');
      const frame = document.getElementById('video-frame');
      if (!servers.length) {
        frame.innerHTML = '<div class="player-placeholder"><div><strong>No video server is available yet.</strong><p>The administrator has not added an embed link for this episode.</p></div></div>';
        list.innerHTML = '';
      } else {
        list.innerHTML = '<span class="muted" style="align-self:center;font-size:.83rem">Choose a server:</span>' + servers.map((server, index) => `<button class="server-button ${index === 0 ? 'active' : ''}" data-server="${index}" type="button">${ui.esc(server.name)}</button>`).join('');
        list.querySelectorAll('[data-server]').forEach((button) => button.addEventListener('click', () => {
          list.querySelectorAll('.server-button').forEach((item) => item.classList.remove('active'));
          button.classList.add('active');
          renderPlayer(servers[Number(button.dataset.server)]);
        }));
        renderPlayer(servers[0]);
      }
      const form = document.getElementById('comment-form');
      api.get('/api/auth/me').then(() => form.classList.remove('hidden')).catch(() => {});
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = document.getElementById('comment-text').value.trim();
        try {
          const result = await api.post('/api/comments', { episode_id: episodeId, text }, { auth: true });
          form.reset();
          ui.showToast(result.message || 'Comment submitted for review.');
        } catch (error) { if (error.status !== 401) ui.showToast(error.message, 'error'); }
      });
      await loadComments(episodeId);
    } catch (error) {
      document.getElementById('video-frame').innerHTML = `<div class="player-placeholder"><div><strong>Episode not found</strong><p>${ui.esc(error.message || 'This episode is unavailable.')}</p><a class="text-link" href="/search.html">Browse anime</a></div></div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', load);
})();
