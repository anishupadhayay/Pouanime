// admin/js/admin-api.js — authenticated same-origin admin API client and toast helpers
(function () {
  'use strict';
  class AdminError extends Error { constructor(message, status) { super(message); this.name = 'AdminError'; this.status = status; } }
  function toast(message, isError = false) {
    const region = document.getElementById('admin-toast-region');
    if (!region) return;
    const node = document.createElement('div');
    node.className = `admin-toast${isError ? ' error' : ''}`;
    node.textContent = String(message || '').slice(0, 300);
    region.append(node);
    setTimeout(() => node.remove(), 4200);
  }
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    let body = options.body;
    if (body !== undefined && body !== null && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    const response = await fetch(path, { method: options.method || 'GET', headers, body, credentials: 'same-origin', cache: 'no-store', signal: options.signal });
    let data = null;
    if ((response.headers.get('content-type') || '').includes('application/json')) {
      try { data = await response.json(); } catch {}
    }
    if (!response.ok) {
      if ([401, 403].includes(response.status) && options.noRedirect !== true && !window.location.pathname.endsWith('/index.html')) {
        window.location.replace(`/admin/index.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
      throw new AdminError(data?.error || `Request failed (${response.status}).`, response.status);
    }
    return data;
  }
  const get = (path, options = {}) => request(path, options);
  const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });
  const patch = (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body });
  const put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body });
  const del = (path, body, options = {}) => request(path, { ...options, method: 'DELETE', body });
  window.AdminAPI = { request, get, post, patch, put, del, toast, AdminError };
})();
