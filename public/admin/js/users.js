// admin/js/users.js — account search, role management, ban, and removal
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let timer;
  async function load() {
    const search = document.getElementById('user-search').value.trim();
    const body = document.getElementById('user-rows');
    try {
      const data = await api.get(`/api/admin/users?q=${encodeURIComponent(search)}`);
      const users = data.users || [];
      body.innerHTML = users.length ? users.map((user) => `<tr><td><strong>${esc(user.email)}</strong></td><td><span class="admin-badge ${user.role === 'admin' ? 'orange' : ''}">${esc(user.role)}</span></td><td><span class="admin-badge ${Number(user.banned) ? 'red' : 'green'}">${Number(user.banned) ? 'Banned' : 'Active'}</span></td><td>${esc(String(user.created_at || '').slice(0, 10))}</td><td><div class="admin-actions">${user.role === 'admin' ? '<button class="admin-button secondary small" data-role="user"' : '<button class="admin-button secondary small" data-role="admin"'} data-user-id="${Number(user.id)}" type="button">${user.role === 'admin' ? 'Demote' : 'Make admin'}</button><button class="admin-button ${Number(user.banned) ? 'secondary' : 'danger'} small" data-ban="${Number(user.banned) ? 0 : 1}" data-user-id="${Number(user.id)}" type="button">${Number(user.banned) ? 'Unban' : 'Ban'}</button><button class="admin-button danger small" data-delete-user="${Number(user.id)}" type="button">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="5" class="admin-muted">No accounts found.</td></tr>';
      body.querySelectorAll('[data-role]').forEach((button) => button.addEventListener('click', async () => {
        try { await api.patch('/api/admin/users', { id: Number(button.dataset.userId), role: button.dataset.role }); api.toast('Account role updated.'); await load(); }
        catch (error) { api.toast(error.message, true); }
      }));
      body.querySelectorAll('[data-ban]').forEach((button) => button.addEventListener('click', async () => {
        try { await api.patch('/api/admin/users', { id: Number(button.dataset.userId), banned: button.dataset.ban === '1' }); api.toast(button.dataset.ban === '1' ? 'Account banned.' : 'Account unbanned.'); await load(); }
        catch (error) { api.toast(error.message, true); }
      }));
      body.querySelectorAll('[data-delete-user]').forEach((button) => button.addEventListener('click', async () => {
        const row = users.find((user) => Number(user.id) === Number(button.dataset.deleteUser));
        if (!row || !window.confirm(`Permanently delete account ${row.email}?`)) return;
        try { await api.del('/api/admin/users', { id: Number(row.id) }); api.toast('Account deleted.'); await load(); }
        catch (error) { api.toast(error.message, true); }
      }));
    } catch (error) { body.innerHTML = `<tr><td colspan="5" class="admin-muted">${esc(error.message)}</td></tr>`; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('user-search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  });
})();
