// presenters/MainPresenter.js - Présentateur principal
class MainPresenter {
  constructor() {
    this.appStateModel = new AppStateModel();
    this.pokemonModel = new PokemonModel();
    this.eggModel = new EggModel();
    this.storageModel = new StorageModel();
    this.shopModel = new ShopModel(this.appStateModel, this.pokemonModel);

    this.uiView = new UIView();
    this.pokemonCollectionView = new PokemonCollectionView(
      document.getElementById("pokemon-list"),
      this.appStateModel,
      this.uiView
    );
    this.eggCollectionView = new EggCollectionView(
      document.getElementById("egg-list"),
      this.appStateModel,
      this.uiView
    );
    this.photoCollectionView = new PhotoCollectionView(
      document.getElementById("photos-list")
    );
    this.shopView = new ShopView(document.getElementById("shop-container"));

    this.gameLogicPresenter = new GameLogicPresenter(
      this.appStateModel,
      this.pokemonModel,
      this.eggModel,
      this.uiView
    );
    this.gameLogicPresenter.setMainPresenter(this);
    
    this.photoPresenter = new PhotoPresenter(this.appStateModel, this.uiView);

    this.init();

    // Ajouter la modal de confirmation
    this.setupConfirmModal();
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
      // Ne pas régénérer les IDs uniques des Pokémon pour conserver les cooldowns
      this.saveData();
    }
  }

  saveData() {
    const data = this.appStateModel.serialize();
    this.storageModel.save(data);
  }

  setupViews() {
    this.pokemonCollectionView.setOnPokemonClick((pokemon) => {
      // Marquer le Pokémon comme vu avant d'afficher les détails
      if (pokemon.isNew) {
        this.appStateModel.markPokemonAsSeen(pokemon.uniqueId);
        this.saveData(); // Sauvegarder le changement
        this.renderPokemonCollection(); // Recharger la collection pour mettre à jour l'ordre
      }
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
        
        // S'assurer que le Pokémon évolué a un uniqueId
        if (!evolvedPokemon.uniqueId) {
          console.log("Génération d'un uniqueId pour le Pokémon évolué:", evolvedPokemon.name);
          evolvedPokemon.uniqueId = `${evolvedPokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Remove selected Pokemon
        selectedIds.forEach(uniqueId => {
          this.appStateModel.removePokemon(uniqueId);
        });

        // Add evolved Pokemon
        this.appStateModel.addPokemon(evolvedPokemon);

        // Save state before showing modal
        this.saveData();

        // Désactiver le mode sélection immédiatement
        this.pokemonCollectionView.disableSelectionMode();
        document.querySelector(".select-duplicates-btn")?.classList.remove("active");

        // Show evolution success modal
        this.uiView.showRewardModal(
          "Évolution réussie !",
          evolvedPokemon.sprites.front_default,
          `Félicitations ! Vos ${selectedPokemons.length} ${this.capitalizeFirstLetter(firstPokemon.name)} ont évolué en ${this.capitalizeFirstLetter(evolvedPokemon.name)} !`
        );

        // Rafraîchir uniquement la collection de Pokémon et les compteurs
        this.refreshCollections({ pokemon: true, counters: true });

      } catch (error) {
        this.uiView.showNotification(error.message);
      } finally {
        this.uiView.hideLoader();
      }
    });

    this.pokemonCollectionView.setOnBreedingSelect(async (selectedIds) => {
      try {
        this.uiView.showLoader();
        const pokemons = this.appStateModel.getPokemons();
        const selectedPokemons = selectedIds.map(id => 
          pokemons.find(p => p.uniqueId === id)
        ).filter(p => p !== undefined);

        if (selectedPokemons.length !== 2) {
          throw new Error("Veuillez sélectionner exactement 2 Pokémon pour l'accouplement.");
        }

        // Vérifier si les Pokémon sont disponibles pour l'accouplement
        for (const pokemon of selectedPokemons) {
          if (!this.appStateModel.isBreedingAvailable(pokemon.uniqueId)) {
            throw new Error(`${this.capitalizeFirstLetter(pokemon.name)} est encore en recharge d'accouplement !`);
          }
        }

        // Créer un œuf d'accouplement avec le premier Pokémon comme parent
        const breedingEgg = this.eggModel.createEgg(selectedPokemons[0]);
        console.log("Created breeding egg:", breedingEgg);

        // Ajouter l'œuf avant de démarrer les cooldowns
        this.appStateModel.addEgg(breedingEgg);
        console.log("Added egg to state, current eggs:", this.appStateModel.getEggs());

        // Démarrer le cooldown pour les deux Pokémon sans les supprimer
        selectedPokemons.forEach(pokemon => {
          this.appStateModel.startBreedingCooldown(pokemon.uniqueId);
          console.log(`Started breeding cooldown for ${pokemon.name} (${pokemon.uniqueId})`);
        });

        this.uiView.hideLoader();
        this.uiView.showRewardModal(
          "Accouplement réussi !",
          "images/egg.png",
          `Les ${selectedPokemons.map(p => this.capitalizeFirstLetter(p.name)).join(" et ")} ont créé un œuf !`
        );

        // Rafraîchir les collections
        this.refreshCollections();
        
        // Désactiver le mode sélection
        this.pokemonCollectionView.disableSelectionMode();
        document.querySelector(".select-duplicates-btn")?.classList.remove("active");

      } catch (error) {
        this.uiView.showNotification(error.message);
      } finally {
        this.uiView.hideLoader();
      }
    });

    this.pokemonCollectionView.setOnDeleteSelect(async (selectedIds) => {
      try {
        if (selectedIds.length === 0) {
          throw new Error("Aucun Pokémon sélectionné pour la suppression");
        }

        // Récupérer les Pokémon sélectionnés
        const selectedPokemons = selectedIds.map(id => {
          const pokemon = this.appStateModel.getPokemonById(id);
          if (!pokemon) {
            throw new Error(`Pokémon introuvable avec l'ID: ${id}`);
          }
          return pokemon;
        });

        // Afficher la modal de confirmation
        this.showConfirmModal(selectedPokemons, async () => {
          try {
            this.uiView.showLoader();

            // Supprimer les Pokémon
            selectedIds.forEach(id => {
              this.appStateModel.removePokemon(id);
            });
            
            // Ajouter les bonbons (1 par Pokémon)
            this.appStateModel.incrementCandyCount(selectedIds.length);

            // Afficher un message de confirmation
            this.uiView.showNotification(`${selectedIds.length} Pokémon ont été recyclés. Vous avez reçu ${selectedIds.length} bonbon${selectedIds.length > 1 ? 's' : ''} !`);

            // Rafraîchir l'affichage
            this.refreshCollections({ pokemon: true, counters: true });
            this.saveData();
          } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            this.uiView.showNotification(error.message);
          } finally {
            this.uiView.hideLoader();
          }
        });

      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        this.uiView.showNotification(error.message);
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

    // Configuration de la vue du shop
    this.shopView.setOnBuyPokeball(async () => {
      try {
        const result = await this.shopModel.buyPokeball();
        this.uiView.showNotification(result.message);
        this.refreshCollections({ counters: true });
        this.renderShop();
      } catch (error) {
        this.uiView.showNotification(error.message);
      }
    });

    this.shopView.setOnBuyShiny(async () => {
      try {
        const result = await this.shopModel.buyShinyPokemon();
        this.uiView.showRewardModal(
          "Nouveau Pokémon Shiny !",
          result.pokemon.sprites.front_default,
          result.message
        );
        this.refreshCollections({ pokemon: true, counters: true });
        this.renderShop();
      } catch (error) {
        this.uiView.showNotification(error.message);
      }
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

    // Mettre à jour le minuteur des Pokéballs toutes les secondes
    setInterval(() => {
      this.renderCounters();
    }, 1000); // Mise à jour toutes les secondes au lieu de toutes les minutes

    // Sauvegarder les données périodiquement (toutes les 30 secondes)
    setInterval(() => {
      this.saveData();
    }, 30000);

    // Vérifier et nettoyer les cooldowns d'accouplement expirés (toutes les 5 secondes)
    setInterval(() => {
      const hadChanges = this.appStateModel.cleanExpiredCooldowns();
      // Mettre à jour uniquement les cooldowns sans recharger toute la collection
      if (hadChanges) {
        const pokemonCards = document.querySelectorAll('.pokemon-card');
        pokemonCards.forEach(card => {
          const pokemonId = card.dataset.id;
          if (pokemonId) {
            const cooldownInfo = this.appStateModel.getBreedingCooldownProgress(pokemonId);
            if (cooldownInfo.progress >= 100) {
              // Retirer les éléments de cooldown si le cooldown est terminé
              card.classList.remove('breeding-cooldown-active');
              const timer = card.querySelector('.breeding-cooldown-timer');
              const cooldownBar = card.querySelector('.breeding-cooldown');
              if (timer) timer.remove();
              if (cooldownBar) cooldownBar.remove();
            }
          }
        });
      }
    }, 5000);

    // Ajouter des Pokéballs périodiquement (1 toutes les 30 minutes)
    setInterval(() => {
      if (this.appStateModel.getUserPokeballs() < this.appStateModel.maxPokeballs) {  // Utiliser la limite maximale de 10
        this.appStateModel.incrementPokeballs();
        this.uiView.showNotification("Vous avez reçu une nouvelle Pokéball !");
        this.saveData();
      }
    }, 1800000); // 30 minutes (30 * 60 * 1000 ms)
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
    this.renderShop();
  }

  renderCounters() {
    // Vérifier si une Pokéball doit être ajoutée
    this.appStateModel.checkAndAddPokeball();
    
    this.uiView.updateCounters(
      this.appStateModel.getUserPokeballs(),
      this.appStateModel.getPokemons().length,
      this.appStateModel.getEggs().length,
      this.appStateModel.getNextPokeballTime(),
      this.appStateModel.getCandyCount()
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
    console.log("Rendering eggs:", eggs.length, "eggs found");
    console.log("Progress data:", progressData);
    this.eggCollectionView.render(eggs, progressData);
  }

  renderPhotoCollection() {
    this.photoCollectionView.render(this.appStateModel.getPhotos());
  }

  renderShop() {
    this.shopView.render(this.appStateModel.getCandyCount());
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

  refreshCollections(options = { pokemon: true, eggs: true, photos: true, counters: true }) {
    console.log("Refreshing collections with options:", options);
    
    if (options.pokemon) {
      this.renderPokemonCollection();
    }
    
    if (options.eggs) {
      this.renderEggCollection();
    }
    
    if (options.photos) {
      this.renderPhotoCollection();
    }
    
    if (options.counters) {
      this.renderCounters();
    }
  }

  // Observer pattern - réagir aux changements d'état
  update(changeType, data) {
    console.log("State update:", changeType, data);
    
    switch (changeType) {
      case "POKEMON_ADDED":
      case "POKEMON_REMOVED":
        this.refreshCollections({ pokemon: true, counters: true });
        this.saveData();
        break;
      case "EGG_ADDED":
      case "EGG_REMOVED":
      case "EGG_UPDATED":
        this.refreshCollections({ eggs: true, counters: true });
        this.saveData();
        break;
      case "PHOTO_ADDED":
        this.refreshCollections({ photos: true });
        this.saveData();
        break;
      case "POKEBALLS_UPDATED":
      case "CANDY_UPDATED":
        this.refreshCollections({ counters: true });
        this.renderShop();
        this.saveData();
        break;
      case "BREEDING_COOLDOWN_STARTED":
      case "BREEDING_COOLDOWNS_UPDATED":
        this.refreshCollections({ pokemon: true });
        this.saveData();
        break;
      case "STATE_HYDRATED":
        this.refreshCollections();
        break;
    }
  }

  async handleBreeding(selectedPokemonIds) {
    if (selectedPokemonIds.length !== 2) {
      this.uiView.showNotification("Sélectionnez exactement 2 Pokémon pour l'accouplement");
      return;
    }

    const pokemon1 = this.appStateModel.getPokemonById(selectedPokemonIds[0]);
    const pokemon2 = this.appStateModel.getPokemonById(selectedPokemonIds[1]);

    if (!pokemon1 || !pokemon2) {
      this.uiView.showNotification("Erreur : Pokémon non trouvé");
      return;
    }

    // Vérifier si les Pokémon sont disponibles pour l'accouplement
    if (!this.appStateModel.isBreedingAvailable(pokemon1.uniqueId)) {
      this.uiView.showNotification(`${this.capitalizeFirstLetter(pokemon1.name)} est encore en recharge d'accouplement !`);
      return;
    }
    if (!this.appStateModel.isBreedingAvailable(pokemon2.uniqueId)) {
      this.uiView.showNotification(`${this.capitalizeFirstLetter(pokemon2.name)} est encore en recharge d'accouplement !`);
      return;
    }

    // Créer un œuf d'accouplement avec le premier Pokémon comme parent
    const breedingEgg = this.eggModel.createBreedingEgg(pokemon1);
    this.appStateModel.addEgg(breedingEgg);

    // Démarrer le cooldown pour les deux Pokémon
    this.appStateModel.startBreedingCooldown(pokemon1.uniqueId);
    this.appStateModel.startBreedingCooldown(pokemon2.uniqueId);

    // Rafraîchir l'affichage
    this.refreshCollections();

    this.uiView.showRewardModal(
      "Accouplement réussi !",
      "images/egg.png",
      `Les ${this.capitalizeFirstLetter(pokemon1.name)} et ${this.capitalizeFirstLetter(pokemon2.name)} ont créé un œuf !`
    );
  }

  setupConfirmModal() {
    // Créer la modal de confirmation
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.id = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-content">
        <h2 class="confirm-title">Confirmer le recyclage</h2>
        <div class="confirm-message"></div>
        <div class="confirm-pokemon-list"></div>
        <div class="confirm-reward"></div>
        <div class="confirm-buttons">
          <button class="confirm-cancel">Annuler</button>
          <button class="confirm-delete">Recycler</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Gérer les événements de la modal
    const cancelBtn = modal.querySelector('.confirm-cancel');
    const deleteBtn = modal.querySelector('.confirm-delete');
    
    cancelBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    // Le gestionnaire pour le bouton de suppression sera ajouté dynamiquement
  }

  showConfirmModal(selectedPokemons, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const messageDiv = modal.querySelector('.confirm-message');
    const listDiv = modal.querySelector('.confirm-pokemon-list');
    const rewardDiv = modal.querySelector('.confirm-reward');
    const deleteBtn = modal.querySelector('.confirm-delete');

    // Mettre à jour le contenu
    messageDiv.textContent = `Vous êtes sur le point de recycler ${selectedPokemons.length} Pokémon.`;

    // Afficher la liste des Pokémon
    listDiv.innerHTML = selectedPokemons.map(pokemon => `
      <div class="confirm-pokemon-item">
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        <span>${this.capitalizeFirstLetter(pokemon.name)}</span>
      </div>
    `).join('');

    // Afficher la récompense
    const candyReward = selectedPokemons.length;
    rewardDiv.innerHTML = `
      <img src="images/super-bonbon.png" alt="Super Bonbon">
      <span>Vous recevrez ${candyReward} bonbon${candyReward > 1 ? 's' : ''}</span>
    `;

    // Mettre à jour le gestionnaire du bouton de suppression
    deleteBtn.onclick = () => {
      onConfirm();
      modal.classList.remove('active');
    };

    // Afficher la modal
    modal.classList.add('active');
  }
}
