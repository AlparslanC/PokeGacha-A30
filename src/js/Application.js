// Application.js - Point d'entrée principal
class Application {
  constructor() {
    this.mainPresenter = null;
    this.connectivityService = null;
    this.connectivityView = null;
  }

  init() {
    // Initialiser le service worker
    ServiceWorkerService.init();
    
    // Initialiser le service de connectivité
    this.connectivityService = new ConnectivityService();
    
    // Attendre que le DOM soit chargé
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    try {
      // Initialiser la vue de connectivité
      this.connectivityView = new ConnectivityView();
      
      // Vérifier la connexion initiale
      this.checkConnectivity();
      
      // Ajouter un écouteur pour les changements de connectivité
      this.connectivityService.addListener((isOnline) => {
        this.handleConnectivityChange(isOnline);
      });
      
      // Ajouter un écouteur pour le bouton de réessai
      document.addEventListener('retry-connection', () => {
        this.checkConnectivity();
      });
      
      // Créer et initialiser le présentateur principal
      this.mainPresenter = new MainPresenter();
      console.log("Application initialisée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'initialisation de l'application:", error);
    }
  }
  
  // Vérifier la connectivité et mettre à jour l'interface
  checkConnectivity() {
    const isOnline = this.connectivityService.checkConnection();
    this.handleConnectivityChange(isOnline);
    return isOnline;
  }
  
  // Gérer les changements de connectivité
  handleConnectivityChange(isOnline) {
    if (isOnline) {
      this.connectivityView.hideOfflineMessage();
    } else {
      this.connectivityView.showOfflineMessage();
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
      ConnectivityView,
    },
    presenters: {
      MainPresenter,
      GameLogicPresenter,
      PhotoPresenter,
    },
    services: {
      ConnectivityService,
    },
  };
}
