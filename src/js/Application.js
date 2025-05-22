// Application.js - Point d'entrée principal
class Application {
  constructor() {
    this.mainPresenter = null;
  }

  init() {
    // Initialiser le service worker
    ServiceWorkerService.init();

    // Attendre que le DOM soit chargé
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    try {
      // Créer et initialiser le présentateur principal
      this.mainPresenter = new MainPresenter();
      console.log("Application initialisée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'initialisation de l'application:", error);
    }
  }
}

// ===== INITIALISATION =====

// Créer et démarrer l'application
const app = new Application();
app.init();

// Exposer globalement pour le debugging (optionnel)
if (typeof window !== "undefined") {
  window.PokemonApp = {
    app,
    // Exposer les classes pour les tests ou le debugging
    models: {
      AppStateModel,
      PokemonModel,
      EggModel,
      StorageModel,
    },
    views: {
      BaseView,
      PokemonCollectionView,
      EggCollectionView,
      PhotoCollectionView,
      UIView,
    },
    presenters: {
      MainPresenter,
      GameLogicPresenter,
      PhotoPresenter,
    },
  };
}
