// server/lib/embeds.js — permit only the video providers supported by Stream
const ALLOWED_HOSTS = [
  'streamtape.com', 'streamtape.to', 'streamta.pe', 'streamtape.cc',
  'doodstream.com', 'dood.to', 'dood.watch', 'dood.wf', 'dood.pm', 'dood.re', 'dood.la', 'dood.li', 'do7go.com',
  'mixdrop.co', 'mixdrop.to', 'mixdrop.sx', 'mixdrop.ag', 'mixdrop.is', 'mixdrop.ch',
  'youtube.com', 'youtube-nocookie.com', 'youtu.be',
];

function hostAllowed(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return ALLOWED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function normalizeEmbedUrl(value) {
  let url;
  try { url = new URL(String(value)); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hostAllowed(url.hostname)) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    let videoId = '';
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    else if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
    else {
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{6,20})/);
      videoId = match?.[1] || '';
    }
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  }
  if (host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
    if (!/^\/embed\/[a-zA-Z0-9_-]{6,20}\/?$/.test(url.pathname)) return null;
  }
  return url.toString();
}

module.exports = { normalizeEmbedUrl, hostAllowed };
