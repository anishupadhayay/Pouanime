// admin/js/admin-auth.js — protect admin pages and handle administrator login/logout
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  function safeNext() {
    const next = new URLSearchParams(window.location.search).get('next') || '/admin/dashboard.html';
    return next.startsWith('/admin/') && !next.startsWith('//') ? next : '/admin/dashboard.html';
  }
  document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      api.get('/api/auth/me', { noRedirect: true }).then(({ user }) => {
        if (user?.role === 'admin') window.location.replace('/admin/dashboard.html');
      }).catch(() => {});
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const errorNode = document.getElementById('login-error');
        errorNode.classList.add('admin-hidden');
        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;
        const values = Object.fromEntries(new FormData(loginForm).entries());
        try {
          const response = await api.post('/api/auth/login', values, { noRedirect: true });
          if (response.user?.role !== 'admin') {
            await api.post('/api/auth/logout', {}, { noRedirect: true });
            throw new Error('This account does not have administrator access.');
          }
          window.location.assign(safeNext());
        } catch (error) {
          errorNode.textContent = error.message || 'Unable to sign in.';
          errorNode.classList.remove('admin-hidden');
        } finally { button.disabled = false; }
      });
      return;
    }

    const sidebar = document.getElementById('admin-sidebar');
    const menu = document.getElementById('admin-menu-toggle');
    if (menu && sidebar) menu.addEventListener('click', () => sidebar.classList.toggle('open'));
    const logout = document.getElementById('admin-logout');
    if (logout) logout.addEventListener('click', async () => {
      try { await api.post('/api/auth/logout', {}); window.location.replace('/admin/index.html'); }
      catch { window.location.replace('/admin/index.html'); }
    });
    try {
      const { user } = await api.get('/api/auth/me', { noRedirect: true });
      if (!user || user.role !== 'admin') {
        window.location.replace('/admin/index.html');
        return;
      }
      const email = document.getElementById('admin-user-email');
      if (email) email.textContent = user.email;
      document.dispatchEvent(new CustomEvent('stream-admin-ready', { detail: { user } }));
    } catch {
      window.location.replace('/admin/index.html');
    }
  });
})();
