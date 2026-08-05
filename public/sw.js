// public/sw.js
//
// Service worker mínimo real (no next-pwa) que hace instalable y parcialmente
// offline la PWA: cachea el app shell y sirve de fallback cuando no hay red.

const CACHE_NAME = 'lamk-shell-v1';
const APP_SHELL = [
  '/',
  '/manifest/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Estrategia network-first con fallback a caché (y a "/" si es navegación de página)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || (event.request.mode === 'navigate' ? caches.match('/') : undefined))
      )
  );
});
