// views/ConnectivityView.js - Affichage des messages de connectivité
class ConnectivityView extends BaseView {
  constructor() {
    super();
    this.offlineOverlay = null;
    this.createOfflineOverlay();
  }
  
  // Créer l'overlay pour l'état hors ligne
  createOfflineOverlay() {
    this.offlineOverlay = document.createElement('div');
    this.offlineOverlay.className = 'offline-overlay';
    this.offlineOverlay.innerHTML = `
      <div class="offline-message">
        <img src="images/no-connection.svg" alt="Pas de connexion" class="offline-icon">
        <h2>Vous n'êtes pas connecté à internet</h2>
        <p>Vérifiez votre connexion et réessayez</p>
        <button id="retry-connection" class="action-button">Réessayer</button>
      </div>
    `;
    
    document.body.appendChild(this.offlineOverlay);
    
    // Ajouter un événement au bouton de réessai
    const retryButton = document.getElementById('retry-connection');
    retryButton.addEventListener('click', () => this.handleRetry());
    
    // Cacher l'overlay par défaut
    this.hideOfflineMessage();
  }
  
  // Afficher le message hors ligne
  showOfflineMessage() {
    this.offlineOverlay.style.display = 'flex';
  }
  
  // Cacher le message hors ligne
  hideOfflineMessage() {
    this.offlineOverlay.style.display = 'none';
  }
  
  // Gérer le clic sur le bouton "Réessayer"
  handleRetry() {
    // Déclencher un événement personnalisé que le présentateur peut écouter
    const event = new CustomEvent('retry-connection');
    document.dispatchEvent(event);
  }
} 