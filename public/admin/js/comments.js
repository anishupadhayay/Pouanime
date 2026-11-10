// admin/js/comments.js — approve or remove episode comments
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  async function load() {
    const list = document.getElementById('comment-list');
    const filter = document.getElementById('comment-filter').value;
    list.innerHTML = '<div class="admin-empty">Loading…</div>';
    try {
      const data = await api.get(`/api/admin/comments?status=${encodeURIComponent(filter)}`);
      const comments = data.comments || [];
      if (!comments.length) { list.innerHTML = '<div class="admin-empty">No comments in this view.</div>'; return; }
      list.innerHTML = comments.map((comment) => `<article class="admin-list-item"><div class="admin-inline" style="justify-content:space-between"><div><strong>${esc(comment.author || 'Deleted account')}</strong><span class="admin-subtle"> · ${esc(comment.created_at || '')}</span></div><span class="admin-badge ${Number(comment.approved) ? 'green' : 'orange'}">${Number(comment.approved) ? 'Approved' : 'Pending'}</span></div><p style="white-space:pre-wrap;margin:10px 0;color:#d8d8df">${esc(comment.text)}</p><div class="admin-inline" style="justify-content:space-between"><span class="admin-subtle">${esc(comment.anime_title || 'Anime')} · Episode ${Number(comment.ep_number) || '—'}</span><div class="admin-actions">${Number(comment.approved) ? `<button class="admin-button secondary small" data-approve="0" data-id="${Number(comment.id)}" type="button">Unpublish</button>` : `<button class="admin-button small" data-approve="1" data-id="${Number(comment.id)}" type="button">Approve</button>`}<button class="admin-button danger small" data-delete="${Number(comment.id)}" type="button">Delete</button></div></div></article>`).join('');
      list.querySelectorAll('[data-approve]').forEach((button) => button.addEventListener('click', async () => {
        try { await api.patch('/api/admin/comments', { id: Number(button.dataset.id), approved: button.dataset.approve === '1' }); api.toast(button.dataset.approve === '1' ? 'Comment approved.' : 'Comment hidden.'); await load(); }
        catch (error) { api.toast(error.message, true); }
      }));
      list.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
        if (!window.confirm('Delete this comment permanently?')) return;
        try { await api.del('/api/admin/comments', { id: Number(button.dataset.delete) }); api.toast('Comment deleted.'); await load(); }
        catch (error) { api.toast(error.message, true); }
      }));
    } catch (error) { list.innerHTML = `<div class="admin-empty">${esc(error.message || 'Could not load comments.')}</div>`; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('comment-filter').addEventListener('change', load);
  });
})();
