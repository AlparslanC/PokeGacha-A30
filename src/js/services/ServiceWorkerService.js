// services/ServiceWorkerService.js - Gestion du Service Worker
class ServiceWorkerService {
  static init() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/pokemongacha/sw.js")
        .then((registration) => {
          console.log("Service Worker enregistré avec succès:", registration);
        })
        .catch((error) => {
          console.log("Échec de l'enregistrement du Service Worker:", error);
        });
    }
  }
}
