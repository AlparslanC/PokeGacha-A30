// sw.js - Service Worker pour le cache et le fonctionnement hors ligne

const CACHE_NAME = "pokégacha-cache-v3";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/Application.js",
  "/js/models/AppStateModel.js",
  "/js/models/PokemonModel.js",
  "/js/models/EggModel.js",
  "/js/models/StorageModel.js",
  "/js/models/ShopModel.js",
  "/js/views/BaseView.js",
  "/js/views/PokemonCollectionView.js",
  "/js/views/EggCollectionView.js",
  "/js/views/PhotoCollectionView.js",
  "/js/views/UIView.js",
  "/js/views/ShopView.js",
  "/js/views/ConnectivityView.js",
  "/js/presenters/MainPresenter.js",
  "/js/presenters/GameLogicPresenter.js",
  "/js/presenters/PhotoPresenter.js",
  "/js/services/ServiceWorkerService.js",
  "/js/services/ConnectivityService.js",
  "/images/egg.png",
  "/images/pokeball.png",
  "/images/pokeball.gif",
  "/images/icon-192x192.png",
  "/images/no-connection.svg",
  "/images/pokemon-icon.png",
  "/images/super-bonbon.png",
  "/manifest.json"
];

// Installation du service worker
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installation en cours...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Mise en cache des ressources");
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.error(
          "[Service Worker] Erreur lors de la mise en cache:",
          error
        );
        // Continue l'installation même si certaines ressources ne peuvent pas être mises en cache
        return Promise.resolve();
      });
    })
  );
  // Force l'activation immédiate du nouveau service worker
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activation en cours...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(
                "[Service Worker] Suppression de l'ancien cache:",
                cacheName
              );
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Prend le contrôle de tous les clients immédiatement
        return self.clients.claim();
      })
  );
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-HTTP/HTTPS
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // Stratégie Cache First pour les ressources statiques
  if (
    event.request.url.includes("/css/") ||
    event.request.url.includes("/js/") ||
    event.request.url.includes("/images/") ||
    event.request.url.endsWith(".html") ||
    event.request.url.endsWith(".json")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log(
            "[Service Worker] Ressource trouvée dans le cache:",
            event.request.url
          );
          return cachedResponse;
        }

        console.log(
          "[Service Worker] Récupération depuis le réseau:",
          event.request.url
        );
        return fetch(event.request)
          .then((networkResponse) => {
            // Vérifier si la réponse est valide
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== "basic"
            ) {
              return networkResponse;
            }

            // Mettre en cache la nouvelle ressource
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return networkResponse;
          })
          .catch((error) => {
            console.error("[Service Worker] Erreur réseau:", error);
            // Retourner une réponse d'erreur personnalisée si nécessaire
            return new Response("Ressource non disponible hors ligne", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
    );
  }
  // Stratégie Network First pour les API externes (PokéAPI)
  else if (event.request.url.includes("pokeapi.co")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Mettre en cache la réponse API
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // En cas d'échec réseau, chercher dans le cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log(
                "[Service Worker] Données API trouvées dans le cache:",
                event.request.url
              );
              return cachedResponse;
            }
            // Retourner une réponse d'erreur JSON
            return new Response(
              JSON.stringify({
                error: "Données Pokémon non disponibles hors ligne",
                offline: true,
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }
            );
          });
        })
    );
  }
  // Pour toutes les autres requêtes, utiliser la stratégie par défaut
  else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            return networkResponse;
          })
          .catch(() => {
            // Si la requête échoue (hors ligne), retourner une page d'erreur
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html')
                .then(response => {
                  if (response) {
                    return response;
                  }
                  
                  // Créer une page HTML minimale avec le contenu de ConnectivityView
                  const offlineHtml = `
                    <!DOCTYPE html>
                    <html lang="fr">
                    <head>
                      <meta charset="UTF-8" />
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                      <title>PokéGacha - Hors ligne</title>
                      <link rel="stylesheet" href="css/style.css" />
                    </head>
                    <body>
                      <div class="offline-overlay" style="display: flex;">
                        <div class="offline-message">
                          <img src="images/no-connection.svg" alt="Pas de connexion" class="offline-icon">
                          <h2>Vous n'êtes pas connecté à internet</h2>
                          <p>Vérifiez votre connexion et réessayez</p>
                          <button id="retry-connection" class="action-button">Réessayer</button>
                        </div>
                      </div>
                      <script>
                        document.getElementById('retry-connection').addEventListener('click', () => {
                          window.location.reload();
                        });
                      </script>
                    </body>
                    </html>
                  `;
                  
                  return new Response(offlineHtml, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                  });
                });
            }
            
            return new Response("Pas de connexion", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
    );
  }
});

// Gestion des messages du thread principal
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_CACHE_STATUS") {
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.keys();
      })
      .then((keys) => {
        event.ports[0].postMessage({
          type: "CACHE_STATUS",
          cachedResources: keys.length,
          cacheName: CACHE_NAME,
        });
      });
  }
});

// Gestion des erreurs
self.addEventListener("error", (event) => {
  console.error("[Service Worker] Erreur:", event.error);
});

// Notification de mise à jour disponible
self.addEventListener("updatefound", () => {
  console.log("[Service Worker] Mise à jour trouvée");
});
