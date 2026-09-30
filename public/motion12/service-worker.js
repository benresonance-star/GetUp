/* MOTION12 r41 retirement service worker.
   App shell caching is retired so static-site updates load directly.
   User data remains in IndexedDB and is not touched here. */

const BUILD_ID = 'canonical-r46-20260930';
const CACHE_PREFIX = 'motion12-shell-';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => caches.delete(key)));
    await self.registration.unregister();
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
    event.ports[0].postMessage({ build: BUILD_ID, cacheVersion: 'retired-r46' });
  }
});
