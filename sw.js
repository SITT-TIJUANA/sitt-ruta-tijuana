// Trabajador de servicios SITT T101
const CACHE = 'sitt-t101-v4';

self.addEventListener('install', function(e) {
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

// RED PRIMERO: siempre intenta traer la versión más reciente del servidor
// y actualiza la copia guardada. Si no hay internet, usa la copia guardada
// como respaldo. Esto evita que la app se quede pegada en una versión vieja.
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(response) {
      const copy = response.clone();
      caches.open(CACHE).then(function(cache) { cache.put(e.request, copy); });
      return response;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
