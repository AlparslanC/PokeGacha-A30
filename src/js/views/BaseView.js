// views/BaseView.js - Classe de base pour les vues
class BaseView {
  constructor(container) {
    this.container = container;
    this.eventHandlers = new Map();
  }

  // Méthodes utilitaires pour la manipulation du DOM
  createElement(tag, className = "", content = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  }

  clearContainer() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  show() {
    if (this.container) {
      this.container.style.display = "block";
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  // Gestion des événements
  bindEvent(element, event, handler, context = this) {
    const boundHandler = handler.bind(context);
    element.addEventListener(event, boundHandler);

    // Stocker pour pouvoir nettoyer plus tard
    if (!this.eventHandlers.has(element)) {
      this.eventHandlers.set(element, []);
    }
    this.eventHandlers.get(element).push({ event, handler: boundHandler });
  }

  unbindEvents() {
    this.eventHandlers.forEach((handlers, element) => {
      handlers.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventHandlers.clear();
  }
}
