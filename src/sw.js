// sw.js - Service Worker pour le cache et le fonctionnement hors ligne

const CACHE_NAME = "pokégacha-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/main.js",
  "/js/app-state.js",
  "/js/storage.js",
  "/js/ui.js",
  "/js/pokemon-service.js",
  "/js/egg-utils.js",
  "/js/photo-controller.js",
  "/js/utils.js",
  "/js/service-worker.js",
  "/js/events.js",
  "/images/pokeball.png",
  "/images/egg.png",
  "/images/pokeball.gif",
  "/images/icon-192x192.png",
];

// Installation du service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Mise en cache des ressources");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activation du service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Suppression de l'ancien cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si la ressource est dans le cache, la renvoyer
      if (response) {
        return response;
      }

      // Sinon, récupérer depuis le réseau
      return fetch(event.request)
        .then((networkResponse) => {
          // Si la réponse n'est pas valide, la renvoyer telle quelle
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // Cloner la réponse pour la mettre en cache
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // En cas d'erreur réseau pour certaines ressources, fournir un fallback
          if (event.request.url.indexOf("/api/") !== -1) {
            return new Response(
              JSON.stringify({ error: "Données non disponibles hors ligne" }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        });
    })
  );
});
