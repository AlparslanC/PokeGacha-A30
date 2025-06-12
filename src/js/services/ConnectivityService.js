// services/ConnectivityService.js - Gestion de la connectivité internet
class ConnectivityService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    
    // Écouter les événements de connectivité
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }
  
  // Vérifier si l'utilisateur est en ligne
  checkConnection() {
    return navigator.onLine;
  }
  
  // Mettre à jour le statut de connexion et notifier les écouteurs
  updateOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    this.notifyListeners(isOnline);
  }
  
  // Ajouter un écouteur pour les changements de connectivité
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  // Retirer un écouteur
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
  
  // Notifier tous les écouteurs
  notifyListeners(isOnline) {
    this.listeners.forEach(listener => listener(isOnline));
  }
} 