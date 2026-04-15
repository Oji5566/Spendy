/* ============================================================
   Spendy Service Worker — Cache-first app shell strategy
   ============================================================ */

const CACHE_NAME = 'spendy-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

/* --- Install: pre-cache app shell --- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* --- Activate: remove stale caches --- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* --- Fetch: cache-first, fall back to network --- */
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin or app-shell resources
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache valid same-origin responses dynamically
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const clone = response.clone();
          // Return both the network response and the cache write together
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
            .then(() => response);
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback: serve index.html for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
