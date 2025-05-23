// presenters/MainPresenter.js - Présentateur principal
class MainPresenter {
  constructor() {
    this.appStateModel = new AppStateModel();
    this.pokemonModel = new PokemonModel();
    this.eggModel = new EggModel();
    this.storageModel = new StorageModel();

    this.uiView = new UIView();
    this.pokemonCollectionView = new PokemonCollectionView(
      document.getElementById("pokemon-list")
    );
    this.eggCollectionView = new EggCollectionView(
      document.getElementById("egg-list")
    );
    this.photoCollectionView = new PhotoCollectionView(
      document.getElementById("photos-list")
    );

    this.gameLogicPresenter = new GameLogicPresenter(
      this.appStateModel,
      this.pokemonModel,
      this.eggModel,
      this.uiView
    );
    this.photoPresenter = new PhotoPresenter(this.appStateModel, this.uiView);

    this.init();
  }

  init() {
    // Charger les données sauvegardées
    this.loadData();

    // Observer les changements d'état
    this.appStateModel.addObserver(this);

    // Configurer les vues
    this.setupViews();

    // Configurer les événements
    this.setupEvents();

    // Démarrer les intervalles
    this.startIntervals();

    // Rendu initial
    this.renderAll();
  }

  loadData() {
    const savedData = this.storageModel.load();
    if (savedData) {
      this.appStateModel.hydrate(savedData);
      // After loading, ensure all Pokemon have unique IDs
      const count = this.appStateModel.regenerateUniqueIds();
      console.log(`Regenerated unique IDs for ${count} Pokemon`);
      // Save the updated data
      this.saveData();
    }
  }

  saveData() {
    const data = this.appStateModel.serialize();
    this.storageModel.save(data);
  }

  setupViews() {
    this.pokemonCollectionView.setOnPokemonClick((pokemon) => {
      this.showPokemonDetails(pokemon);
    });

    this.pokemonCollectionView.setOnEvolutionSelect(async (selectedIds) => {
      try {
        this.uiView.showLoader();
        
        // Get selected Pokemon
        const pokemons = this.appStateModel.getPokemons();
        const selectedPokemons = pokemons.filter(p => selectedIds.includes(p.uniqueId));
        
        if (selectedPokemons.length < 2) {
          throw new Error("Pas assez de Pokémon sélectionnés pour l'évolution");
        }

        // Verify all Pokemon are the same species
        const firstPokemon = selectedPokemons[0];
        if (!selectedPokemons.every(p => p.name === firstPokemon.name)) {
          throw new Error("Les Pokémon sélectionnés doivent être de la même espèce");
        }

        // Get evolution data
        const evolvedPokemon = await this.pokemonModel.getNextEvolution(firstPokemon);
        
        if (!evolvedPokemon) {
          throw new Error("Ce Pokémon ne peut pas évoluer davantage");
        }

        // Remove selected Pokemon
        selectedIds.forEach(uniqueId => {
          this.appStateModel.removePokemon(uniqueId);
        });

        // Add evolved Pokemon
        this.appStateModel.addPokemon(evolvedPokemon);

        // Save state before showing modal
        this.saveData();

        // Show evolution success modal
        this.uiView.showRewardModal(
          "Évolution réussie !",
          evolvedPokemon.sprites.front_default,
          `Félicitations ! Vos ${selectedPokemons.length} ${this.capitalizeFirstLetter(firstPokemon.name)} ont évolué en ${this.capitalizeFirstLetter(evolvedPokemon.name)} !`
        );

        // Reload page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (error) {
        this.uiView.showNotification(error.message);
      } finally {
        this.uiView.hideLoader();
      }
    });

    this.eggCollectionView.setOnHatchClick((index) => {
      this.gameLogicPresenter.hatchEgg(index);
    });

    this.eggCollectionView.setOnShakeModeClick((index) => {
      const isActive = this.gameLogicPresenter.toggleShakeMode(index);
      return isActive;
    });

    this.photoCollectionView.setOnPhotoClick((photo) => {
      this.showPhotoDetails(photo);
    });
  }

  setupEvents() {
    // Bouton d'ouverture de Pokéball
    const openPokeballBtn = document.getElementById("open-pokeball");
    if (openPokeballBtn) {
      openPokeballBtn.addEventListener("click", () => {
        this.gameLogicPresenter.openPokeball();
      });
    }

    // Sauvegarder les données avant de quitter/recharger la page
    window.addEventListener("beforeunload", () => {
      this.saveData();
    });

    // Gestion des onglets
    this.setupTabEvents();

    // Gestion de la modal
    this.setupModalEvents();
  }

  setupTabEvents() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;

        // Désactiver tous les onglets et contenus
        tabs.forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => c.classList.remove("active"));

        // Activer l'onglet et le contenu sélectionnés
        tab.classList.add("active");
        document.getElementById(tabName).classList.add("active");

        // Gérer la caméra pour l'onglet photos
        if (tabName === "photos") {
          this.photoPresenter.initCamera();
          this.gameLogicPresenter.stopShakeDetection();
        } else if (tabName === "eggs") {
          this.photoPresenter.stopCamera();
          this.gameLogicPresenter.startShakeDetection();
        } else {
          this.photoPresenter.stopCamera();
          this.gameLogicPresenter.stopShakeDetection();
        }
      });
    });
  }

  setupModalEvents() {
    const modalClose = document.getElementById("modal-close");
    const modal = document.getElementById("pokemon-modal");

    if (modalClose) {
      modalClose.addEventListener("click", () => {
        this.uiView.hideModal();
      });
    }

    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          this.uiView.hideModal();
        }
      });
    }
  }

  startIntervals() {
    // Mettre à jour la progression des œufs
    setInterval(() => {
      this.updateEggProgress();
    }, 1000);

    // Sauvegarder les données périodiquement (toutes les 30 secondes)
    setInterval(() => {
      this.saveData();
    }, 30000);

    // Ajouter des Pokéballs périodiquement (1 par heure)
    setInterval(() => {
      if (this.appStateModel.getUserPokeballs() < 10) {
        this.appStateModel.incrementPokeballs();
        this.uiView.showNotification("Vous avez reçu une nouvelle Pokéball !");
        this.saveData();
      }
    }, 3600000); // 1 heure (60 * 60 * 1000 ms)
  }

  updateEggProgress() {
    const eggs = this.appStateModel.getEggs();
    const progressData = eggs.map((egg) =>
      this.eggModel.calculateProgress(egg)
    );

    // Mettre à jour uniquement la barre de progression et le texte
    eggs.forEach((egg, index) => {
      const eggCard = document.querySelector(`.egg-card[data-index="${index}"]`);
      if (!eggCard) return;

      const progressBar = eggCard.querySelector(".egg-progress-bar");
      const progressText = eggCard.querySelector(".egg-progress-text");
      const progress = progressData[index];

      if (progressBar) {
        progressBar.style.width = `${progress.progress}%`;
      }

      if (progressText) {
        progressText.textContent = `${Math.floor(progress.progress)}%`;
      }

      // Ne mettre à jour le bouton que si l'œuf est prêt
      if (progress.isReady) {
        const actionsDiv = eggCard.querySelector(".egg-actions");
        if (actionsDiv) {
          const currentButton = actionsDiv.querySelector("button");
          if (currentButton && !currentButton.classList.contains("hatch-btn")) {
            actionsDiv.innerHTML = '<button class="hatch-btn">Faire éclore</button>';
            const newHatchBtn = actionsDiv.querySelector(".hatch-btn");
            this.eggCollectionView.bindEvent(newHatchBtn, "click", (e) => {
              e.stopPropagation();
              if (this.eggCollectionView.onHatchClick) {
                this.eggCollectionView.onHatchClick(index);
              }
            });
          }
        }
      }
    });
  }

  renderAll() {
    this.renderCounters();
    this.renderPokemonCollection();
    this.renderEggCollection();
    this.renderPhotoCollection();
  }

  renderCounters() {
    this.uiView.updateCounters(
      this.appStateModel.getUserPokeballs(),
      this.appStateModel.getPokemons().length,
      this.appStateModel.getEggs().length
    );
  }

  renderPokemonCollection() {
    this.pokemonCollectionView.render(this.appStateModel.getPokemons());
  }

  renderEggCollection() {
    const eggs = this.appStateModel.getEggs();
    const progressData = eggs.map((egg) =>
      this.eggModel.calculateProgress(egg)
    );
    this.eggCollectionView.render(eggs, progressData);
  }

  renderPhotoCollection() {
    this.photoCollectionView.render(this.appStateModel.getPhotos());
  }

  async showPokemonDetails(pokemon) {
    try {
      if (!pokemon) {
        throw new Error("Données du Pokémon manquantes");
      }

      this.uiView.showLoader();

      let speciesData;
      try {
        if (!pokemon.species?.url) {
          // Fallback si l'URL de l'espèce est manquante
          const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${pokemon.id || pokemon.name}/`;
          speciesData = await this.pokemonModel.fetchPokemonSpecies(speciesUrl);
        } else {
          speciesData = await this.pokemonModel.fetchPokemonSpecies(
            pokemon.species.url
          );
        }
      } catch (error) {
        console.warn("Impossible de récupérer les détails de l'espèce:", error);
        // On continue avec les informations de base
        speciesData = {
          flavor_text_entries: []
        };
      }

      // Trouver une description en français
      const frDescription = speciesData.flavor_text_entries.find(
        (entry) => entry.language.name === "fr"
      );

      const description = frDescription
        ? frDescription.flavor_text
        : "Aucune information disponible en français.";

      const content = `
        <p class="pokemon-description">${description}</p>
        <div class="pokemon-stats">
          <p><strong>Types:</strong> ${(pokemon.types || [])
            .map((t) => this.capitalizeFirstLetter(t.type?.name || "inconnu"))
            .join(", ") || "Type inconnu"}</p>
        </div>
        <div class="pokemon-abilities">
          <p><strong>Capacités:</strong> ${(pokemon.abilities || [])
            .map((a) => this.capitalizeFirstLetter(a.ability?.name || "inconnue"))
            .join(", ") || "Capacités inconnues"}</p>
        </div>
      `;

      this.uiView.hideLoader();
      this.uiView.updateModalContent(
        this.capitalizeFirstLetter(pokemon.name || "Pokémon inconnu"),
        pokemon.sprites?.front_default || "",
        content
      );
      this.uiView.showModal();
    } catch (error) {
      console.error(
        "Erreur lors de l'affichage des détails du Pokémon:",
        error
      );

      // Afficher un message d'erreur convivial à l'utilisateur
      const errorContent = `
        <div class="error-message">
          <p>Désolé, une erreur est survenue lors du chargement des détails.</p>
          <div class="pokemon-stats">
            <p><strong>Types:</strong> ${(pokemon?.types || [])
              .map((t) => this.capitalizeFirstLetter(t.type?.name || "inconnu"))
              .join(", ") || "Type inconnu"}</p>
          </div>
        </div>
      `;

      this.uiView.hideLoader();
      this.uiView.updateModalContent(
        this.capitalizeFirstLetter(pokemon?.name || "Pokémon inconnu"),
        pokemon?.sprites?.front_default || "",
        errorContent
      );
      this.uiView.showModal();
    }
  }

  showPhotoDetails(photo) {
    const content = `<p>Date: ${new Date(photo.date).toLocaleDateString()}</p>`;

    this.uiView.updateModalContent(
      "Photo avec " + this.capitalizeFirstLetter(photo.pokemon.name),
      photo.image || photo.dataUrl,
      content
    );

    this.uiView.showModal();
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Observer pattern - réagir aux changements d'état
  update(changeType, data) {
    // Fonction pour sauvegarder avec une petite attente
    const saveWithDelay = () => {
      setTimeout(() => {
        this.saveData();
        // Vérifier que la sauvegarde a bien été effectuée
        const savedData = this.storageModel.load();
        if (savedData) {
          const expectedLength = this.appStateModel.getPokemons().length;
          const actualLength = savedData.pokemons.length;
          if (expectedLength !== actualLength) {
            console.warn(`Problème de sauvegarde détecté: ${expectedLength} pokémons attendus, ${actualLength} sauvegardés`);
            // Réessayer la sauvegarde
            this.saveData();
          }
        }
      }, 100);
    };

    switch (changeType) {
      case "POKEMON_ADDED":
        this.renderPokemonCollection();
        this.renderCounters();
        saveWithDelay();
        break;
      case "EGG_ADDED":
        this.renderEggCollection();
        this.renderCounters();
        saveWithDelay();
        break;
      case "EGG_REMOVED":
        this.renderEggCollection();
        this.renderCounters();
        saveWithDelay();
        break;
      case "EGG_UPDATED":
        this.updateEggProgress();
        saveWithDelay();
        break;
      case "PHOTO_ADDED":
        this.renderPhotoCollection();
        saveWithDelay();
        break;
      case "POKEBALLS_UPDATED":
        this.renderCounters();
        saveWithDelay();
        break;
      case "STATE_HYDRATED":
        this.renderAll();
        break;
    }
  }
}
