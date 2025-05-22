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

    this.eggCollectionView.setOnIncubateClick((index) => {
      this.gameLogicPresenter.incubateEgg(index);
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
        } else {
          this.photoPresenter.stopCamera();
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

    this.eggCollectionView.updateProgress(eggs, progressData);

    // Vérifier si des œufs sont prêts à éclore
    eggs.forEach((egg, index) => {
      if (progressData[index].isReady && !egg.hatched) {
        this.gameLogicPresenter.hatchEgg(index);
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
      this.uiView.showLoader();

      const speciesData = await this.pokemonModel.fetchPokemonSpecies(
        pokemon.species.url
      );

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
          <p><strong>Taille:</strong> ${pokemon.height / 10} m</p>
          <p><strong>Poids:</strong> ${pokemon.weight / 10} kg</p>
          <p><strong>Types:</strong> ${pokemon.types
            .map((t) => this.capitalizeFirstLetter(t.type.name))
            .join(", ")}</p>
        </div>
        <div class="pokemon-abilities">
          <p><strong>Capacités:</strong> ${pokemon.abilities
            .map((a) => this.capitalizeFirstLetter(a.ability.name))
            .join(", ")}</p>
        </div>
        <div class="pokemon-rarity-info">
          <p><strong>Rareté:</strong> ${this.capitalizeFirstLetter(
            pokemon.rarity || "common"
          )}</p>
        </div>
      `;

      this.uiView.updateModalContent(
        this.capitalizeFirstLetter(pokemon.name),
        pokemon.sprites.front_default,
        content
      );

      this.uiView.hideLoader();
      this.uiView.showModal();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des détails de l'espèce:",
        error
      );

      // Afficher des informations de base si l'API ne répond pas
      const basicContent = `
        <div class="pokemon-stats">
          <p><strong>Taille:</strong> ${pokemon.height / 10} m</p>
          <p><strong>Poids:</strong> ${pokemon.weight / 10} kg</p>
          <p><strong>Types:</strong> ${pokemon.types
            .map((t) => this.capitalizeFirstLetter(t.type.name))
            .join(", ")}</p>
          <p><strong>Rareté:</strong> ${this.capitalizeFirstLetter(
            pokemon.rarity || "common"
          )}</p>
        </div>
      `;

      this.uiView.updateModalContent(
        this.capitalizeFirstLetter(pokemon.name),
        pokemon.sprites.front_default,
        basicContent
      );

      this.uiView.hideLoader();
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
    switch (changeType) {
      case "POKEMON_ADDED":
        this.renderPokemonCollection();
        this.renderCounters();
        this.saveData();
        break;
      case "EGG_ADDED":
        this.renderEggCollection();
        this.renderCounters();
        this.saveData();
        break;
      case "EGG_REMOVED":
        this.renderEggCollection();
        this.renderCounters();
        this.saveData();
        break;
      case "EGG_UPDATED":
        this.renderEggCollection();
        this.saveData();
        break;
      case "PHOTO_ADDED":
        this.renderPhotoCollection();
        this.saveData();
        break;
      case "POKEBALLS_UPDATED":
        this.renderCounters();
        this.saveData();
        break;
      case "STATE_HYDRATED":
        this.renderAll();
        break;
    }
  }
}
