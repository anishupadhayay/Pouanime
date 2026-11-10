// admin/js/settings.js — fetch and save the public-facing site settings
(function () {
  'use strict';
  const api = window.AdminAPI;
  if (!api) return;
  function apply(settings = {}) {
    document.getElementById('site-name').value = settings.site_name || 'Stream';
    document.getElementById('site-tagline').value = settings.site_tagline || '';
    document.getElementById('footer-text').value = settings.footer_text || '';
    document.getElementById('contact-email').value = settings.contact_email || '';
    document.getElementById('ads-enabled').checked = settings.ads_enabled === 'true';
  }
  document.addEventListener('DOMContentLoaded', async () => {
    try { const data = await api.get('/api/admin/settings'); apply(data.settings); }
    catch (error) { api.toast(error.message, true); }
    document.getElementById('settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      const settings = {
        site_name: document.getElementById('site-name').value.trim(),
        site_tagline: document.getElementById('site-tagline').value.trim(),
        footer_text: document.getElementById('footer-text').value.trim(),
        contact_email: document.getElementById('contact-email').value.trim(),
        ads_enabled: String(document.getElementById('ads-enabled').checked),
      };
      try { const data = await api.put('/api/admin/settings', { settings }); apply(data.settings); api.toast('Settings saved.'); }
      catch (error) { api.toast(error.message || 'Could not save settings.', true); }
      finally { button.disabled = false; }
    });
  });
})();
