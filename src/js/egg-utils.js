// egg-utils.js - Utilitaires pour la gestion des œufs

import appState from "./app-state.js";
import { pokemonService } from "./pokemon-service.js";

// Utilitaires pour la gestion des œufs
export const eggUtils = {
  // Calculer la progression de l'œuf
  calculateEggProgress(egg) {
    const now = Date.now();
    const timeElapsed = now - egg.startTime;
    const progress = Math.min(100, (timeElapsed / egg.hatchTime) * 100);
    const formatTime = (ms) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / 1000 / 60) % 60);
      const hours = Math.floor(ms / 1000 / 60 / 60);
      return `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`;
    };

    // Si l'œuf est prêt à éclore
    if (progress >= 100 && !egg.hatched) {
      this.hatchEgg(appState.eggs.indexOf(egg));
    }

    return {
      progress,
      timeElapsedFormatted: formatTime(timeElapsed),
      timeTotalFormatted: formatTime(egg.hatchTime),
    };
  },

  // Incuber un œuf (accélérer son éclosion)
  incubateEgg(index) {
    const egg = appState.eggs[index];

    // Réduire le temps restant
    const remaining = egg.hatchTime - (Date.now() - egg.startTime);
    if (remaining > 0) {
      egg.hatchTime -= Math.min(remaining, 5000); // Réduire de 1 minute max
      appState.eggs[index] = egg;
      window.storageController.saveToLocalStorage();
      window.uiController.renderEggs();
      window.uiController.showNotification("Vous avez réchauffé l'œuf !");
    }
  },

  // Faire éclore un œuf
  hatchEgg(index) {
    const egg = appState.eggs[index];

    if (!egg.hatched) {
      egg.hatched = true;

      // Récupérer un Pokémon aléatoire
      window.pokemonService
        .fetchRandomPokemon()
        .then((pokemon) => {
          appState.pokemons.push(pokemon);
          appState.eggs.splice(index, 1);
          window.storageController.saveToLocalStorage();
          window.uiController.updateUI();
          window.uiController.showNotification(
            `Un ${window.utils.capitalizeFirstLetter(pokemon.name)} est né !`
          );
          window.uiController.showPokemonDetails(pokemon);
        })
        .catch((error) => {
          console.error("Erreur lors de l'éclosion:", error);
          window.uiController.showNotification(
            "Erreur lors de l'éclosion de l'œuf."
          );
        });
    }
  },
};

// Exposer les utilitaires aux autres modules
window.eggUtils = eggUtils;
