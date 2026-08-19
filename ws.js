const CACHE_NAME = 'garmin-deck-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network requests pass through cleanly to the WebSocket and API
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});