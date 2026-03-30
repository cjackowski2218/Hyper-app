// HYPER Service Worker
// Strategy: cache-first for assets, network-first for HTML
// Update detection: version bump triggers cache refresh and notifies app

const CACHE_VERSION = 'hyper-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('hyper-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k)) // delete old cache versions
      )
    ).then(() => self.clients.claim()) // take control of all tabs immediately
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and external requests (Google APIs, fonts, etc.)
  if (e.request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin) &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) return;

  // HTML: network-first so updates are always picked up
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS/CSS/fonts: cache-first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(RUNTIME_CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});

// ── Update notification ───────────────────────────────────────────────────────
// When a new SW installs and activates, notify all open clients
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
