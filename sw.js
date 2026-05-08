const CACHE = 'todo-v15';
const ASSETS = [
  '/01_ToDoApp/',
  '/01_ToDoApp/index.html',
  '/01_ToDoApp/manifest.json',
  '/01_ToDoApp/css/app.css',
  '/01_ToDoApp/js/app.js',
  '/01_ToDoApp/js/store.js',
  '/01_ToDoApp/js/ui.js',
  '/01_ToDoApp/js/sw-register.js',
  '/01_ToDoApp/icons/apple-touch-icon.png',
  '/01_ToDoApp/icons/icon-192.png',
  '/01_ToDoApp/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Cache-first for same-origin GET requests
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (e.request.mode === 'navigate') return caches.match('/01_ToDoApp/index.html');
      });
    })
  );
});
