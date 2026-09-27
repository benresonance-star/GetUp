/* MOTION12 permanent app shell service worker.
   User data is NOT stored here. Training/settings data remains in IndexedDB "motion12". */

const CACHE_PREFIX = 'motion12-shell-';
const CACHE_VERSION = '2026-09-27-r18';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './theme-r7.css',
  './app-r7.css',
  './compact-workout-r8.css',
  './compact-workout-r9.css',
  './compact-workout-r10.css',
  './compact-workout-r11.css',
  './meal-configurator-r12.css',
  './palette-r13.css',
  './workout-theme-r16.css',
  './theme-outlines-r17.css',
  './program-r7.js',
  './persistence-v1-r7.js',
  './state-r14.js',
  './ui-r14.js'
];

function shellUrl(url) {
  return new URL(url, self.registration.scope).href;
}

async function fetchFresh(url) {
  const absolute = shellUrl(url);
  const response = await fetch(new Request(absolute, { cache: 'no-store' }));
  if (!response || !response.ok) {
    throw new Error('MOTION12 shell fetch failed: ' + url);
  }
  return { absolute, response };
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      const fresh = await fetchFresh(url);
      await cache.put(fresh.absolute, fresh.response.clone());
    }
  })());
  // Deliberately do not call skipWaiting() here.
  // The running app stays intact until the user taps "Refresh" on the update banner.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(new Request(request, { cache: 'no-store' }));
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match(request)) ||
      (fallbackUrl ? await cache.match(shellUrl(fallbackUrl)) : undefined) ||
      Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  event.respondWith(networkFirst(request));
});
