/* MOTION12 r86 push worker. No app-shell caching, no worker self-unregister. */
const BUILD_ID='canonical-r86-20261101';
const CACHE_PREFIX='motion12-shell-';
const APP_URL='https://benresonance-star.github.io/GetUp/public/motion12/?flow=tomorrow';

self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let data={};
    try{data=event.data?.json()||{};}catch(_){}
    await self.registration.showNotification(data.title||'MOTION12 · Prepare for tomorrow',{
      body:data.body||'Review your session and choose one focus.',
      tag:data.tag||'motion12-evening-flow',
      icon:'./icon-192.png',
      badge:'./icon-192.png',
      silent:true,
      data:{url:data.url||APP_URL}
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>client.url.includes('/GetUp/public/motion12/'));
    if(existing){await existing.focus();existing.postMessage({type:'M12_OPEN_FLOW_PREVIEW'});}
    else await self.clients.openWindow(event.notification.data?.url||APP_URL);
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='GET_BUILD'&&event.ports?.[0])event.ports[0].postMessage({build:BUILD_ID,cacheVersion:'push-r86'});
});
