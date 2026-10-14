/**
 * EduOS Service Worker v2.0
 * Забезпечує повноцінне офлайн-функціонування тренажера в комп'ютерному класі (Cache-First).
 */

const CACHE_NAME = 'eduos-cache-v18';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/icons.css',
  './css/desktop.css',
  './css/taskbar.css',
  './css/start-menu.css',
  './css/windows.css',
  './css/context-menu.css',
  './css/applications.css',
  './css/dialogs.css',
  './css/responsive.css',
  './libs/jszip.min.js',
  './libs/jspdf.umd.min.js',
  './js/core/dialogs.js',
  './js/core/input-language.js',
  './js/apps/about-system.js',
  './assets/icons/favicon.svg',
  './assets/icons/logo.svg',
  './assets/icons/paint.svg',
  './assets/icons/notepad.svg',
  './assets/icons/archiver.svg',
  './assets/icons/explorer.svg',
  './assets/icons/this-pc.svg',
  './assets/icons/recycle-bin.svg',
  './assets/icons/image-viewer.svg',
  './assets/icons/cmd.svg',
  './assets/icons/bash.svg',
  './assets/icons/browser.svg',
  './assets/icons/settings.svg',
  './assets/icons/disk.svg',
  './assets/icons/tasks.svg',
  './assets/icons/network.svg',
  './assets/icons/learning.svg',
  './assets/icons/editor.svg',
  './assets/wallpapers/default_fluent.jpg',
  './assets/wallpapers/light_fluent.jpg',
  './tasks/catalog.json',
  './tasks/grade5-desktop-basics.json',
  './tasks/grade6-file-operations.json',
  './tasks/grade7-archives.json',
  './tasks/grade8-cli-basics.json',
  './tasks/grade9-permissions-settings.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets v3');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-First: спочатку свіжий файл із сервера, при офлайні — кеш
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.match('./index.html');
        });
      })
  );
});
