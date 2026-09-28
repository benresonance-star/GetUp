/* MOTION12 permanent app shell service worker.
   User data is NOT stored here. Training/settings data remains in IndexedDB "motion12". */

const CACHE_PREFIX = 'motion12-shell-';
const BUILD_ID = 'canonical-r39-20260928';
const CACHE_VERSION = '2026-09-28-r39';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const APP_SHELL = [
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './theme.css',
  './app.css',
  './program.js',
  './persistence.js',
  './state.js',
  './ui.js'
]

function shellUrl(url) {
  return new URL(url, self.registration.scope).href;
}

async function fetchFresh(url) {
  const absolute = shellUrl(url);
  const fetchUrl = new URL(absolute);
  fetchUrl.searchParams.set('m12-build', BUILD_ID);
  const response = await fetch(new Request(fetchUrl.href, { cache: 'reload' }));
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
      if (url === './index.html') {
        const html = await fresh.response.clone().text();
        if (!html.includes(BUILD_ID)) {
          throw new Error('MOTION12 refused a stale HTML shell for ' + BUILD_ID);
        }
      }
      if (url === './ui.js') {
        const ui = await fresh.response.clone().text();
        if (!ui.includes('streak-quote-by')) {
          throw new Error('MOTION12 refused a stale UI shell for ' + BUILD_ID);
        }
      }
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
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'GET_BUILD' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ build: BUILD_ID, cacheVersion: CACHE_VERSION });
  }
});

async function cacheFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  if (fallbackUrl) {
    const fallback = await cache.match(shellUrl(fallbackUrl));
    if (fallback) return fallback;
  }

  try {
    return await fetch(request);
  } catch (error) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Atomic app-shell rule:
  // the active worker serves one complete cached build until a newly installed
  // worker is explicitly activated. This prevents new HTML being mixed with
  // old CSS/JS during an update.
  if (request.mode === 'navigate') {
    event.respondWith(cacheFirst(shellUrl('./index.html')));
    return;
  }

  const normalized = new URL(url.href);
  normalized.searchParams.delete('v');
  normalized.searchParams.delete('m12-build');

  const shellPath = APP_SHELL.find(path => shellUrl(path) === normalized.href);
  if (shellPath) {
    event.respondWith(cacheFirst(shellUrl(shellPath)));
  }
});
