/**
 * Service Worker — PWA offline support cho Bỏ Tay Ra app
 * Chiến lược: Cache-First cho assets tĩnh và CDN (TF.js models)
 *             Network-First cho các request HTML
 */

const CACHE_NAME = 'hand-detection-v1';
const CACHE_CDN_NAME = 'hand-detection-cdn-v1';

// Assets tĩnh của app (sẽ được cache khi install)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// CDN hosts cần cache (TF.js models, weights)
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'storage.googleapis.com',
  'tfhub.dev',
  'www.gstatic.com',
];

// ===== Install =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((e) => console.warn('[SW] Install cache failed:', e))
  );
});

// ===== Activate — xóa cache cũ =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== CACHE_CDN_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== Fetch =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bỏ qua requests không phải GET
  if (event.request.method !== 'GET') return;

  // CDN resources (TF.js, model weights) — Cache-First
  if (CDN_HOSTS.some((host) => url.hostname.includes(host))) {
    event.respondWith(
      caches.open(CACHE_CDN_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // HTML navigation — Network-First với fallback về index.html
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (JS, CSS, media) — Cache-First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
