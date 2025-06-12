// views/PokemonCollectionView.js - Vue pour la collection de Pokémon
class PokemonCollectionView extends BaseView {
  constructor(container, appStateModel, uiView) {
    super(container);
    this.appStateModel = appStateModel;
    this.uiView = uiView;
    this.onPokemonClick = null;
    this.onEvolutionSelect = null;
    this.onBreedingSelect = null;
    this.onDeleteSelect = null;  // Nouveau callback pour la suppression
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
    const selectButton = this.createElement("button", "select-duplicates-btn", "sélectionner pokemon");
    selectButton.addEventListener("click", () => {
      console.log("Bouton de sélection cliqué");
      this.toggleSelectionMode(selectButton);
    });
    
    // Bouton d'évolution
    const evolveButton = this.createElement("button", "evolve-btn", "Faire évoluer");
    evolveButton.addEventListener("click", (e) => {
      console.log("Bouton évolution cliqué");
      if (evolveButton.classList.contains("active")) {
        e.preventDefault();
        e.stopPropagation();
        this.evolveSelected();
      } else {
        console.log("Bouton évolution non actif");
      }
    });

    // Bouton d'accouplement
    const breedButton = this.createElement("button", "breed-btn", "Accoupler");
    breedButton.addEventListener("click", (e) => {
      console.log("Bouton accouplement cliqué");
      if (breedButton.classList.contains("active")) {
        e.preventDefault();
        e.stopPropagation();
        this.breedSelected();
      } else {
        console.log("Bouton accouplement non actif");
      }
    });

    // Bouton de suppression
    const deleteButton = this.createElement("button", "delete-btn", "Recycler");
    deleteButton.addEventListener("click", (e) => {
      console.log("Bouton suppression cliqué");
      if (deleteButton.classList.contains("active")) {
        e.preventDefault();
        e.stopPropagation();
        this.deleteSelected();
      } else {
        console.log("Bouton suppression non actif");
      }
    });
    
    controls.appendChild(selectButton);
    controls.appendChild(evolveButton);
    controls.appendChild(breedButton);
    controls.appendChild(deleteButton);
    
    return controls;
  }

  createPokemonCard(pokemon, pokemonCounts) {
    const card = this.createElement("div", "pokemon-card");
    
    // Vérifier que le Pokémon a un uniqueId valide
    if (!pokemon.uniqueId) {
      console.error("Pokémon sans uniqueId:", pokemon);
      // Générer un ID temporaire si nécessaire
      pokemon.uniqueId = `${pokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Ajouter les attributs data pour l'identification
    card.dataset.id = pokemon.uniqueId;
    card.dataset.name = pokemon.name;
    card.dataset.speciesId = pokemon.id;
    
    console.log(`Création carte pour ${pokemon.name} avec uniqueId: ${pokemon.uniqueId}`);

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
      button.textContent = "sélectionner pokemon";
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
        card.classList.add("selectable");
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
      console.log(`Pokémon non sélectionnable: ${pokemon.name}`);
      return;
    }
    
    // Vérifier que le Pokémon a un uniqueId valide
    if (!pokemon.uniqueId || !card.dataset.id) {
      console.error("Pokémon ou carte sans uniqueId valide:", {
        pokemonName: pokemon.name,
        pokemonId: pokemon.uniqueId,
        cardId: card.dataset.id
      });
      return;
    }
    
    const pokemonId = card.dataset.id;
    
    if (card.classList.contains("selected")) {
      card.classList.remove("selected");
      this.selectedPokemon.delete(pokemonId);
      console.log(`Pokémon désélectionné: ${pokemon.name} (${pokemonId})`);
    } else {
      card.classList.add("selected");
      this.selectedPokemon.add(pokemonId);
      console.log(`Pokémon sélectionné: ${pokemon.name} (${pokemonId})`);
    }
    
    console.log(`Nombre total de Pokémon sélectionnés: ${this.selectedPokemon.size}`);
    console.log(`Pokémon sélectionnés:`, Array.from(this.selectedPokemon));
    
    // Forcer une mise à jour directe des boutons d'action
    setTimeout(() => {
      this.updateActionButtons();
      console.log("Mise à jour forcée des boutons d'action");
    }, 0);
  }

  updateEvolutionButton() {
    // Appeler directement updateActionButtons
    this.updateActionButtons();
    console.log("updateEvolutionButton -> updateActionButtons");
  }

  updateActionButtons() {
    const evolveButton = document.querySelector(".evolve-btn");
    const breedButton = document.querySelector(".breed-btn");
    const deleteButton = document.querySelector(".delete-btn");
    
    // Ajouter des logs pour déboguer
    console.log("Mise à jour des boutons d'action:");
    console.log("- Pokémon sélectionnés:", this.selectedPokemon.size);
    console.log("- Bouton évoluer trouvé:", !!evolveButton);
    console.log("- Bouton accoupler trouvé:", !!breedButton);
    console.log("- Bouton recycler trouvé:", !!deleteButton);
    
    if (evolveButton) {
      const isActive = this.selectedPokemon.size >= 2;
      console.log("- Bouton évoluer actif:", isActive);
      
      // Réinitialiser complètement les styles et classes
      evolveButton.className = "evolve-btn";
      evolveButton.style.pointerEvents = "none";
      evolveButton.style.opacity = "0.6";
      evolveButton.style.cursor = "default";
      
      // Supprimer tous les gestionnaires d'événements existants
      const newEvolveButton = evolveButton.cloneNode(true);
      newEvolveButton.textContent = "Faire évoluer";
      evolveButton.parentNode.replaceChild(newEvolveButton, evolveButton);
      
      if (isActive) {
        newEvolveButton.classList.add("active");
        newEvolveButton.style.pointerEvents = "auto";
        newEvolveButton.style.opacity = "1";
        newEvolveButton.style.cursor = "pointer";
        
        // Ajouter un nouveau gestionnaire d'événements
        newEvolveButton.addEventListener("click", (e) => {
          console.log("Bouton évoluer cliqué!");
          e.preventDefault();
          e.stopPropagation();
          this.evolveSelected();
        });
      }
    }
    
    if (breedButton) {
      const isActive = this.selectedPokemon.size === 2;
      console.log("- Bouton accoupler actif:", isActive);
      
      // Réinitialiser complètement les styles et classes
      breedButton.className = "breed-btn";
      breedButton.style.pointerEvents = "none";
      breedButton.style.opacity = "0.6";
      breedButton.style.cursor = "default";
      
      // Supprimer tous les gestionnaires d'événements existants
      const newBreedButton = breedButton.cloneNode(true);
      newBreedButton.textContent = "Accoupler";
      breedButton.parentNode.replaceChild(newBreedButton, breedButton);
      
      if (isActive) {
        newBreedButton.classList.add("active");
        newBreedButton.style.pointerEvents = "auto";
        newBreedButton.style.opacity = "1";
        newBreedButton.style.cursor = "pointer";
        
        // Ajouter un nouveau gestionnaire d'événements
        newBreedButton.addEventListener("click", (e) => {
          console.log("Bouton accoupler cliqué!");
          e.preventDefault();
          e.stopPropagation();
          this.breedSelected();
        });
      }
    }

    if (deleteButton) {
      const isActive = this.selectedPokemon.size > 0;
      console.log("- Bouton recycler actif:", isActive);
      
      // Réinitialiser complètement les styles et classes
      deleteButton.className = "delete-btn";
      deleteButton.style.pointerEvents = "none";
      deleteButton.style.opacity = "0.6";
      deleteButton.style.cursor = "default";
      
      // Supprimer tous les gestionnaires d'événements existants
      const newDeleteButton = deleteButton.cloneNode(true);
      newDeleteButton.textContent = "Recycler";
      deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
      
      if (isActive) {
        newDeleteButton.classList.add("active");
        newDeleteButton.style.pointerEvents = "auto";
        newDeleteButton.style.opacity = "1";
        newDeleteButton.style.cursor = "pointer";
        
        // Ajouter un nouveau gestionnaire d'événements
        newDeleteButton.addEventListener("click", (e) => {
          console.log("Bouton recycler cliqué!");
          e.preventDefault();
          e.stopPropagation();
          this.deleteSelected();
        });
      }
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

  deleteSelected() {
    if (this.selectedPokemon.size > 0 && this.onDeleteSelect) {
      this.onDeleteSelect(Array.from(this.selectedPokemon));
      this.disableSelectionMode();
      document.querySelector(".select-duplicates-btn")?.classList.remove("active");
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

  setOnDeleteSelect(callback) {
    this.onDeleteSelect = callback;
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
