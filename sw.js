// Keeps Noor working offline. Pages and settings come from the network first, everything else from the cache
// while it refreshes in the background. Firestore requests are never touched.
const CACHE = 'noor-v1';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './css/app.css',
  './js/app.js',
  './js/logic.js',
  './js/i18n.js',
  './js/store.js',
  './js/sky.js',
  './js/fx.js',
  './js/reminders.js',
  './vendor/firebase.js',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || cache.match('./index.html');
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);
  const fresh = fetch(event.request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(fresh);
    return cached;
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;
  if (request.mode === 'navigate' || url.pathname.endsWith('/config.js')) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});
