// Trabajador de servicios SITT T101
const CACHE = 'sitt-t101-v3';

self.addEventListener('install', function(e) {
  // NO se activa solo: espera a que el usuario confirme desde el banner
  // "Nueva versión disponible" (ver app.js -> aplicarActualizacion())
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(['/sitt-ruta-tijuana/', '/sitt-ruta-tijuana/index.html']);
    })
  );
});

// Mensaje desde la app: el usuario tocó "Actualizar"
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});
