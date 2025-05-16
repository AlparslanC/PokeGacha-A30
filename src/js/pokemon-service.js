// pokemon-service.js - Gestion des opérations liées aux Pokémon

import appState from "./app-state.js";
import { eggUtils } from "./egg-utils.js";

// Service Pokémon
export const pokemonService = {
  // Ouvrir une Pokéball
  openPokeball() {
    if (appState.userPokeballs <= 0) {
      window.uiController.showNotification("Vous n'avez plus de Pokéball !");
      return;
    }

    appState.userPokeballs--;
    window.uiController.updateCounters();
    window.storageController.saveToLocalStorage();

    // Animation d'ouverture
    window.uiController.elements.pokeball.classList.add("open");
    window.uiController.showLoader();

    // Déterminer si on obtient un Pokémon ou un œuf (70% Pokémon, 30% œuf)
    const isPokemon = Math.random() < 0.7;

    if (isPokemon) {
      this.fetchRandomPokemon()
        .then((pokemon) => {
          appState.pokemons.push(pokemon);
          window.storageController.saveToLocalStorage();
          window.uiController.updateUI();
          window.uiController.hideLoader();
          window.uiController.showNotification(
            `Vous avez capturé un ${window.utils.capitalizeFirstLetter(
              pokemon.name
            )} !`
          );
          window.uiController.showPokemonDetails(pokemon);

          // Réinitialiser l'animation
          setTimeout(() => {
            window.uiController.elements.pokeball.classList.remove("open");
          }, 1000);
        })
        .catch((error) => {
          console.error("Erreur lors de la récupération du Pokémon:", error);
          window.uiController.hideLoader();
          window.uiController.showNotification(
            "Erreur lors de la capture du Pokémon."
          );
          window.uiController.elements.pokeball.classList.remove("open");
        });
    } else {
      // Créer un œuf
      setTimeout(() => {
        const newEgg = {
          id: Date.now(),
          startTime: Date.now(),
          hatchTime: 30000  + Math.random() * 90000, // Entre 1h et 3h
          hatched: false,
        };

        appState.eggs.push(newEgg);
        window.storageController.saveToLocalStorage();
        window.uiController.updateUI();
        window.uiController.hideLoader();
        window.uiController.showNotification("Vous avez trouvé un œuf !");

        // Réinitialiser l'animation
        setTimeout(() => {
          window.uiController.elements.pokeball.classList.remove("open");
        }, 1000);
      }, 1000);
    }
  },

  // Récupérer un Pokémon aléatoire depuis l'API
  fetchRandomPokemon() {
    window.uiController.showLoader();

    // ID aléatoire entre 1 et 898 (nombre de Pokémon dans l'API)
    const randomId = Math.floor(Math.random() * 1025) + 1;

    return fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur réseau lors de la récupération des données.");
        }
        return response.json();
      })
      .then((data) => {
        window.uiController.hideLoader();
        return data;
      })
      .catch((error) => {
        window.uiController.hideLoader();
        console.error("Erreur lors de la récupération des données:", error);
        throw error;
      });
  },
};

// Exposer le service aux autres modules
window.pokemonService = pokemonService;
