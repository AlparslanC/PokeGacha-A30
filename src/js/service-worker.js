// service-worker.js - Gestion du service worker

// Initialiser le service worker
export function initServiceWorker() {
  // Vérifier si le service worker est supporté
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("../sw.js")
      .then((registration) => {
        console.log("Service Worker enregistré avec succès:", registration);
      })
      .catch((error) => {
        console.log("Échec de l'enregistrement du Service Worker:", error);
      });
  }
}
