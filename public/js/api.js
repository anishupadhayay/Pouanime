// public/js/api.js — small same-origin fetch client for Stream
(function () {
  'use strict';
  class APIError extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.details = details;
    }
  }

  async function request(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    let body = options.body;
    if (body !== undefined && body !== null && !(body instanceof FormData) && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    const response = await fetch(path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      cache: options.cache || 'no-store',
      signal: options.signal,
    });
    let payload = null;
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      try { payload = await response.json(); } catch { payload = null; }
    }
    if (!response.ok) {
      const message = payload?.error || `Request failed with status ${response.status}.`;
      if (response.status === 401 && options.auth === true) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login.html?next=${next}`);
      }
      throw new APIError(message, response.status, payload?.details);
    }
    return payload;
  }

  const get = (path, options = {}) => request(path, options);
  const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });
  const patch = (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body });
  const put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body });
  const del = (path, body, options = {}) => request(path, { ...options, method: 'DELETE', body });
  window.StreamAPI = { request, get, post, patch, put, del, APIError };
})();
