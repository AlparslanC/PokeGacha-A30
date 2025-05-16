// main.js - Point d'entrée principal de l'application
import { initStorage } from "./storage.js";
import { initUI } from "./ui.js";
import { initEvents } from "./events.js";
import { initServiceWorker } from "./service-worker.js";

// Attendre que le DOM soit chargé
document.addEventListener("DOMContentLoaded", () => {
  // Initialiser le service worker
  initServiceWorker();

  // Initialiser l'application
  initApp();
});

// Initialiser l'application
function initApp() {
  // Initialiser le stockage (charger les données)
  initStorage();

  // Initialiser l'interface utilisateur
  initUI();

  // Configurer les écouteurs d'événements
  initEvents();

  // Démarrer les intervalles (pour les œufs et les pokéballs)
  startIntervals();
}

// Démarrer les intervalles périodiques
function startIntervals() {
  // Vérifier périodiquement l'état des œufs
  setInterval(() => {
    const { eggs } = window.appState;
    const needsUpdate = eggs.some((egg) => {
      const progress = window.eggUtils.calculateEggProgress(egg);
      return progress < 100 && progress > 0;
    });

    if (needsUpdate) {
      window.uiController.renderEggs();
    }
  }, 100); // Vérifier toutes les minutes

  // Actualiser les compteurs toutes les 5 minutes (pour les Pokéballs)
  setInterval(() => {
    const { userPokeballs } = window.appState;
    if (userPokeballs < 10) {
      window.appState.userPokeballs++;
      window.uiController.updateCounters();
      window.storageController.saveToLocalStorage();
      window.uiController.showNotification(
        "Vous avez reçu une nouvelle Pokéball !"
      );
    }
  }, 100000); // 5 minutes
}
