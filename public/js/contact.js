// public/js/contact.js — open a pre-addressed message in the visitor's mail application
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', async () => {
    let contactEmail = '';
    try {
      const data = await window.StreamAPI.get('/api/settings');
      contactEmail = String(data.settings?.contact_email || '').trim();
    } catch {}
    const form = document.getElementById('contact-form');
    const note = document.getElementById('contact-note');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!contactEmail) {
        note.textContent = 'The site administrator has not configured a contact email yet.';
        note.classList.remove('hidden');
        note.classList.add('form-error');
        return;
      }
      const data = new FormData(form);
      const subject = `Stream message from ${String(data.get('name') || '').trim()}`;
      const body = `From: ${String(data.get('name') || '').trim()}\nReply to: ${String(data.get('email') || '').trim()}\n\n${String(data.get('message') || '').trim()}`;
      window.location.href = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });
})();
