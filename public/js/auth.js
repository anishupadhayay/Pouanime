// public/js/auth.js — login and account registration forms
(function () {
  'use strict';
  const api = window.StreamAPI;
  if (!api) return;
  function destination() {
    const candidate = new URLSearchParams(window.location.search).get('next') || '/';
    return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
  }
  document.addEventListener('DOMContentLoaded', () => {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
    if (!login && !register) return;
    api.get('/api/auth/me').then(({ user }) => {
      if (user) window.location.replace(user.role === 'admin' ? '/admin/dashboard.html' : destination());
    }).catch(() => {});
    const form = login || register;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorNode = document.getElementById('auth-error');
      errorNode.classList.add('hidden');
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      const values = Object.fromEntries(new FormData(form).entries());
      try {
        const endpoint = login ? '/api/auth/login' : '/api/auth/register';
        const data = await api.post(endpoint, values);
        if (data.user?.role === 'admin') window.location.assign('/admin/dashboard.html');
        else window.location.assign(destination());
      } catch (error) {
        errorNode.textContent = error.message || 'Unable to sign in. Please try again.';
        errorNode.classList.remove('hidden');
      } finally { button.disabled = false; }
    });
  });
})();
