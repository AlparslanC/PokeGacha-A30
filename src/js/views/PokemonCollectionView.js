// views/PokemonCollectionView.js - Vue pour la collection de Pokémon
class PokemonCollectionView extends BaseView {
  constructor(container, appStateModel, uiView) {
    super(container);
    this.appStateModel = appStateModel;
    this.uiView = uiView;
    this.onPokemonClick = null;
    this.onEvolutionSelect = null;
    this.onBreedingSelect = null;
    this.isSelectionMode = false;
    this.selectedPokemon = new Set();
    this.currentPokemonType = null;
    this.cooldownTimers = new Map(); // Pour stocker les intervalles de mise à jour
  }

  // Ajouter une méthode pour nettoyer les timers
  clearCooldownTimers() {
    this.cooldownTimers.forEach(timer => clearInterval(timer));
    this.cooldownTimers.clear();
  }

  render(pokemons) {
    this.clear();

    if (pokemons.length === 0) {
      this.container.innerHTML =
        "<p class='text-center'>Aucun Pokémon capturé pour l'instant.</p>";
      return;
    }

    // Ajouter les contrôles d'évolution dans leur conteneur dédié
    const controls = this.createEvolutionControls();
    const controlsContainer = document.getElementById('evolution-controls-container');
    if (controlsContainer) {
      controlsContainer.innerHTML = '';
      controlsContainer.appendChild(controls);
    }
    
    // Grouper les Pokémon par espèce pour compter les doublons
    const pokemonCounts = this.countPokemonBySpecies(pokemons);

    // Nettoyer les anciens timers avant de recréer les cartes
    this.clearCooldownTimers();

    // Ajouter les cartes Pokémon
    pokemons.forEach((pokemon) => {
      const pokemonCard = this.createPokemonCard(pokemon, pokemonCounts);
      this.container.appendChild(pokemonCard);
    });

    this.updateEvolutionButton();
  }

  countPokemonBySpecies(pokemons) {
    const counts = new Map();
    pokemons.forEach(pokemon => {
      if (!pokemon.isShiny) {  // Ne pas compter les shinys
        const key = pokemon.name;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return counts;
  }

  createEvolutionControls() {
    const controls = this.createElement("div", "evolution-controls");
    
    // Bouton de sélection des doublons
    const selectButton = this.createElement("button", "select-duplicates-btn", "Sélectionner les doublons");
    this.bindEvent(selectButton, "click", () => this.toggleSelectionMode(selectButton));
    
    // Bouton d'évolution
    const evolveButton = this.createElement("button", "evolve-btn", "Faire évoluer");
    this.bindEvent(evolveButton, "click", () => this.evolveSelected());

    // Bouton d'accouplement
    const breedButton = this.createElement("button", "breed-btn", "Accoupler");
    this.bindEvent(breedButton, "click", () => this.breedSelected());
    
    controls.appendChild(selectButton);
    controls.appendChild(evolveButton);
    controls.appendChild(breedButton);
    
    return controls;
  }

  createPokemonCard(pokemon, pokemonCounts) {
    const card = this.createElement("div", "pokemon-card");
    card.dataset.id = pokemon.uniqueId;
    card.dataset.name = pokemon.name;
    card.dataset.speciesId = pokemon.id;

    if (pokemon.isShiny) {
      card.classList.add("shiny");
    }

    // Ajouter la barre de progression de recharge d'accouplement
    const cooldownInfo = this.appStateModel.getBreedingCooldownProgress(pokemon.uniqueId);
    if (cooldownInfo.progress < 100) {
      const timer = this.createElement("div", "breeding-cooldown-timer");
      const timerText = this.createElement("span", "breeding-cooldown-timer-text");
      timer.appendChild(timerText);
      card.appendChild(timer);

      const breedingCooldown = this.createElement("div", "breeding-cooldown");
      const progressBar = this.createElement("div", "breeding-cooldown-bar");
      const progressText = this.createElement("div", "breeding-cooldown-text");
      breedingCooldown.appendChild(progressBar);
      breedingCooldown.appendChild(progressText);
      card.appendChild(breedingCooldown);
      card.classList.add("breeding-cooldown-active");

      // Fonction de mise à jour du timer et de la barre de progression
      const updateCooldown = () => {
        const currentInfo = this.appStateModel.getBreedingCooldownProgress(pokemon.uniqueId);
        if (currentInfo.progress >= 100) {
          clearInterval(this.cooldownTimers.get(pokemon.uniqueId));
          this.cooldownTimers.delete(pokemon.uniqueId);
          card.classList.remove("breeding-cooldown-active");
          timer.remove();
          breedingCooldown.remove();
          return;
        }

        const minutes = Math.floor(currentInfo.timeLeft / 60);
        const seconds = currentInfo.timeLeft % 60;
        timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        progressBar.style.width = `${currentInfo.progress}%`;
        progressText.textContent = `Recharge: ${Math.floor(currentInfo.progress)}%`;
      };

      // Initialiser le timer
      updateCooldown();
      
      // Mettre à jour toutes les secondes
      const intervalId = setInterval(updateCooldown, 1000);
      this.cooldownTimers.set(pokemon.uniqueId, intervalId);
    }

    if (pokemon.isNew) {
      card.classList.add("new");
      const newBadge = this.createElement("span", "new-badge", "Nouveau !");
      newBadge.dataset.pokemonId = pokemon.uniqueId;
      card.appendChild(newBadge);
    }

    // Add duplicate counter if > 1
    const count = pokemonCounts.get(pokemon.name);
    if (count > 1 && !pokemon.isShiny) {
      const counter = this.createElement("span", "evolution-count", `x${count}`);
      card.appendChild(counter);
    }

    // Type badges
    const typeContainer = this.createElement("div", "pokemon-types");
    pokemon.allTypes.forEach((type) => {
      const typeBadge = this.createElement(
        "span",
        `pokemon-type ${type}`,
        type
      );
      typeContainer.appendChild(typeBadge);
    });
    card.appendChild(typeContainer);

    // Image
    const image = this.createElement("img", "pokemon-image");
    image.src = pokemon.isShiny ? pokemon.sprites.front_shiny : pokemon.sprites.front_default;
    image.alt = pokemon.name;

    // Name
    const name = this.createElement(
      "p",
      "pokemon-name",
      `#${String(pokemon.id).padStart(3, '0')} - ${this.capitalizeFirstLetter(pokemon.name)}${pokemon.isShiny ? " ✨" : ""}`
    );

    card.appendChild(image);
    card.appendChild(name);

    // Click event
    this.bindEvent(card, "click", (event) => {
      if (this.isSelectionMode && !pokemon.isShiny) {
        event.stopPropagation();
        // Vérifier si le Pokémon est disponible pour l'accouplement
        if (this.appStateModel.isBreedingAvailable(pokemon.uniqueId)) {
          this.togglePokemonSelection(card, pokemon);
        } else {
          this.uiView.showNotification("Ce Pokémon est en recharge d'accouplement !");
        }
      } else if (this.onPokemonClick && !this.isSelectionMode) {
        if (pokemon.isNew) {
          this.removeNewBadge(pokemon.uniqueId);
        }
        this.onPokemonClick(pokemon);
      }
    });

    return card;
  }

  toggleSelectionMode(button) {
    this.isSelectionMode = !this.isSelectionMode;
    button.classList.toggle("active");
    
    if (this.isSelectionMode) {
      button.textContent = "Annuler la sélection";
      this.enableSelectionMode();
    } else {
      button.textContent = "Sélectionner les doublons";
      this.disableSelectionMode();
    }
  }

  enableSelectionMode() {
    this.selectedPokemon.clear();
    const cards = this.container.querySelectorAll(".pokemon-card");
    let duplicateCount = new Map();

    // First pass: count duplicates
    cards.forEach(card => {
      if (!card.classList.contains("shiny")) {
        const pokemonName = card.dataset.name;
        duplicateCount.set(pokemonName, (duplicateCount.get(pokemonName) || 0) + 1);
      }
    });

    // Second pass: mark selectable cards
    cards.forEach(card => {
      if (!card.classList.contains("shiny")) {
        const pokemonName = card.dataset.name;
        const count = duplicateCount.get(pokemonName) || 0;
        
        if (count > 1) {
          card.classList.add("selectable");
        } else {
          card.classList.add("not-selectable");
        }
      } else {
        card.classList.add("not-selectable");
      }
    });
  }

  disableSelectionMode() {
    this.selectedPokemon.clear();
    this.currentPokemonType = null;
    const cards = this.container.querySelectorAll(".pokemon-card");
    cards.forEach(card => {
      card.classList.remove("selectable", "selected", "not-selectable");
    });
    this.updateEvolutionButton();
  }

  removeNewBadge(pokemonId) {
    const card = this.container.querySelector(`.pokemon-card[data-id="${pokemonId}"]`);
    if (card) {
      card.classList.remove("new");
      const badge = card.querySelector(`.new-badge[data-pokemon-id="${pokemonId}"]`);
      if (badge) {
        badge.remove();
      }
    }
  }

  togglePokemonSelection(card, pokemon) {
    if (!card.classList.contains("selectable")) {
      return;
    }
    
    if (this.currentPokemonType && pokemon.name !== this.currentPokemonType) {
      this.selectedPokemon.clear();
      this.container.querySelectorAll(".pokemon-card.selected").forEach(card => {
        card.classList.remove("selected");
      });
      this.currentPokemonType = pokemon.name;
    } else if (!this.currentPokemonType) {
      this.currentPokemonType = pokemon.name;
    }
    
    const pokemonId = card.dataset.id;
    
    if (card.classList.contains("selected")) {
      card.classList.remove("selected");
      this.selectedPokemon.delete(pokemonId);
    } else {
      card.classList.add("selected");
      this.selectedPokemon.add(pokemonId);
    }
    
    this.updateEvolutionButton();
  }

  updateEvolutionButton() {
    this.updateActionButtons();
  }

  updateActionButtons() {
    const evolveButton = document.querySelector(".evolve-btn");
    const breedButton = document.querySelector(".breed-btn");
    
    if (evolveButton) {
      evolveButton.classList.toggle("active", this.selectedPokemon.size >= 2);
    }
    
    if (breedButton) {
      breedButton.classList.toggle("active", this.selectedPokemon.size === 2);
    }
  }

  evolveSelected() {
    if (this.selectedPokemon.size >= 2 && this.onEvolutionSelect) {
      this.onEvolutionSelect(Array.from(this.selectedPokemon));
      this.disableSelectionMode();
      document.querySelector(".select-duplicates-btn")?.classList.remove("active");
    }
  }

  breedSelected() {
    if (this.selectedPokemon.size === 2 && this.onBreedingSelect) {
      this.onBreedingSelect(Array.from(this.selectedPokemon));
      this.disableSelectionMode();
    }
  }

  setOnPokemonClick(callback) {
    this.onPokemonClick = callback;
  }

  setOnEvolutionSelect(callback) {
    this.onEvolutionSelect = callback;
  }

  setOnBreedingSelect(callback) {
    this.onBreedingSelect = callback;
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // N'oubliez pas de nettoyer les timers lors de la destruction de la vue
  destroy() {
    this.clearCooldownTimers();
    super.destroy();
  }
}
