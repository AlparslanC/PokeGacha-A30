// storage.js - Gestion du stockage local

import appState from "./app-state.js";

// Contrôleur de stockage
window.storageController = {
  // Charger les données depuis le localStorage
  loadFromLocalStorage() {
    const savedPokemons = localStorage.getItem("pokemons");
    const savedEggs = localStorage.getItem("eggs");
    const savedPhotos = localStorage.getItem("photos");
    const savedPokeballs = localStorage.getItem("pokeballs");

    if (savedPokemons) appState.pokemons = JSON.parse(savedPokemons);
    if (savedEggs) appState.eggs = JSON.parse(savedEggs);
    if (savedPhotos) appState.photos = JSON.parse(savedPhotos);
    if (savedPokeballs) appState.userPokeballs = parseInt(savedPokeballs);
  },

  // Sauvegarder les données dans le localStorage
  saveToLocalStorage() {
    localStorage.setItem("pokemons", JSON.stringify(appState.pokemons));
    localStorage.setItem("eggs", JSON.stringify(appState.eggs));
    localStorage.setItem("photos", JSON.stringify(appState.photos));
    localStorage.setItem("pokeballs", appState.userPokeballs.toString());
  },
};

// Initialiser le stockage
export function initStorage() {
  window.storageController.loadFromLocalStorage();
}
