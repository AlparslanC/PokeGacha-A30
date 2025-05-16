// utils.js - Fonctions utilitaires génériques

// Utilitaires
export const utils = {
  // Mettre en majuscule la première lettre d'une chaîne
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },
};

// Exposer les utilitaires aux autres modules
window.utils = utils;
