const CACHE_NAME = 'campuspulse-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/slides.html',
  '/style.css',
  '/detail.css',
  '/functional.css',
  '/gate.css',
  '/app.js',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).catch(() => cached);
    })
  );
});
