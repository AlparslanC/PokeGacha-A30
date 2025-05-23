// views/PokemonCollectionView.js - Vue pour la collection de Pokémon
class PokemonCollectionView extends BaseView {
  constructor(container) {
    super(container);
    this.onPokemonClick = null;
    this.onEvolutionSelect = null;
    this.isSelectionMode = false;
    this.selectedPokemon = new Set();
    this.currentPokemonType = null;
  }

  render(pokemons) {
    this.clearContainer();

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
    
    controls.appendChild(selectButton);
    controls.appendChild(evolveButton);
    
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
    image.src = pokemon.sprites.front_default;
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
        this.togglePokemonSelection(card, pokemon);
      } else if (this.onPokemonClick && !this.isSelectionMode) {
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
    const evolveButton = document.getElementById('evolution-controls-container')?.querySelector(".evolve-btn");
    if (evolveButton) {
      evolveButton.classList.toggle("active", this.selectedPokemon.size >= 2);
    }
  }

  evolveSelected() {
    if (this.selectedPokemon.size >= 2 && this.onEvolutionSelect) {
      this.onEvolutionSelect(Array.from(this.selectedPokemon));
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

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
