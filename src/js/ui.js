// ui.js - Gestion de l'interface utilisateur

import appState from "./app-state.js";
import { utils } from "./utils.js";
import { pokemonService } from "./pokemon-service.js";
import { eggUtils } from "./egg-utils.js";

// Contrôleur de l'interface utilisateur
window.uiController = {
  // Éléments du DOM
  elements: {
    pokeball: null,
    pokemonList: null,
    eggList: null,
    photosList: null,
    pokeballCount: null,
    pokemonCount: null,
    eggCount: null,
    modal: null,
    modalPokemonName: null,
    modalPokemonImage: null,
    modalPokemonInfo: null,
    loader: null,
    notification: null,
    photoPokemonSelection: null,
    photoContainer: null,
  },

  // Initialiser l'interface utilisateur
  init() {
    this.initDOMReferences();
    this.updateUI();
    this.startProgressUpdater();
  },

  // Initialiser les références aux éléments DOM
  initDOMReferences() {
    this.elements.pokeball = document.getElementById("pokeball");
    this.elements.pokemonList = document.getElementById("pokemon-list");
    this.elements.eggList = document.getElementById("egg-list");
    this.elements.photosList = document.getElementById("photos-list");
    this.elements.pokeballCount = document.getElementById("pokeball-count");
    this.elements.pokemonCount = document.getElementById("pokemon-count");
    this.elements.eggCount = document.getElementById("egg-count");
    this.elements.modal = document.getElementById("pokemon-modal");
    this.elements.modalPokemonName =
      document.getElementById("modal-pokemon-name");
    this.elements.modalPokemonImage = document.getElementById(
      "modal-pokemon-image"
    );
    this.elements.modalPokemonInfo =
      document.getElementById("modal-pokemon-info");
    this.elements.loader = document.getElementById("loader");
    this.elements.notification = document.getElementById("notification");
    this.elements.photoPokemonSelection = document.getElementById(
      "photo-pokemon-selection"
    );
    this.elements.photoContainer = document.querySelector(".photo-container");
  },

  // Démarrer la mise à jour automatique de la progression des œufs
  startProgressUpdater() {
    // Mettre à jour toutes les secondes
    setInterval(() => {
      this.updateEggProgress();
    }, 1000);
  },

  // Mettre à jour la progression des œufs
  updateEggProgress() {
    appState.eggs.forEach((egg, index) => {
      const eggCard = document.querySelector(
        `.egg-card[data-index="${index}"]`
      );
      if (!eggCard) return;

      const progressBar = eggCard.querySelector(".egg-progress-bar");
      const progressText = eggCard.querySelector(".egg-progress-text");

      if (progressBar) {
        const progress = eggUtils.calculateEggProgress(egg);
        progressBar.style.width = `${progress.progress}%`;

        if (progressText) {
          progressText.textContent = `${Math.floor(progress.progress)}%`;
        }

        // Ajouter une animation de pulsation si l'œuf est prêt à éclore
        if (progress.progress >= 100) {
          eggCard.classList.add("egg-ready");
        } else {
          eggCard.classList.remove("egg-ready");
        }
      }
    });
  },

  // Mettre à jour l'interface utilisateur
  updateUI() {
    this.renderPokemonCollection();
    this.renderEggs();
    this.renderPhotos();
    this.renderPokemonSelectionForPhotos();
    this.updateCounters();
  },

  // Mettre à jour les compteurs
  updateCounters() {
    this.elements.pokeballCount.textContent = appState.userPokeballs;
    this.elements.pokemonCount.textContent = appState.pokemons.length;
    this.elements.eggCount.textContent = appState.eggs.length;
  },

  // Afficher la collection de Pokémon
  renderPokemonCollection() {
    const pokemonList = this.elements.pokemonList;
    pokemonList.innerHTML = "";

    if (appState.pokemons.length === 0) {
      pokemonList.innerHTML =
        "<p class='text-center'>Aucun Pokémon capturé pour l'instant.</p>";
      return;
    }

    appState.pokemons.forEach((pokemon) => {
      const pokemonCard = document.createElement("div");
      pokemonCard.className = "pokemon-card";
      pokemonCard.dataset.id = pokemon.id;

      // Ajout du badge de rareté
      const rarityBadge = document.createElement("div");
      rarityBadge.className = `pokemon-rarity ${pokemon.rarity || "common"}`;
      pokemonCard.appendChild(rarityBadge);

      // Contenu de la carte
      const image = document.createElement("img");
      image.src = pokemon.sprites.front_default;
      image.alt = pokemon.name;
      image.className = "pokemon-image";

      const name = document.createElement("p");
      name.className = "pokemon-name";
      name.textContent = utils.capitalizeFirstLetter(pokemon.name);

      pokemonCard.appendChild(image);
      pokemonCard.appendChild(name);

      pokemonCard.addEventListener("click", () =>
        this.showPokemonDetails(pokemon)
      );
      pokemonList.appendChild(pokemonCard);
    });
  },

  // Afficher les œufs
  renderEggs() {
    const eggList = this.elements.eggList;
    eggList.innerHTML = "";

    if (appState.eggs.length === 0) {
      eggList.innerHTML =
        "<p class='text-center'>Vous n'avez pas d'œufs pour le moment.</p>";
      return;
    }

    appState.eggs.forEach((egg, index) => {
      const eggElement = document.createElement("div");
      eggElement.className = "egg-card";
      eggElement.dataset.index = index;

      // Calculer la progression de l'œuf
      const progressData = eggUtils.calculateEggProgress(egg);

      eggElement.innerHTML = `
        <img src="images/egg.png" alt="Œuf de Pokémon" class="egg-image">
        <div class="egg-progress">
          <div class="egg-progress-bar" style="width: ${
            progressData.progress
          }%;"></div>
          <div class="egg-progress-text">${Math.floor(
            progressData.progress
          )}%</div>
        </div>
        <div class="egg-times">
        </div>
        <button class="incubate-btn">Réchauffer</button>
      `;

      // Ajouter une classe si l'œuf est prêt à éclore
      if (progressData.progress >= 100) {
        eggElement.classList.add("egg-ready");
      }

      // Ajouter un événement au bouton plutôt qu'à toute la carte
      const incubateBtn = eggElement.querySelector(".incubate-btn");
      incubateBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Empêche la propagation du clic à la carte
        eggUtils.incubateEgg(index);
      });

      eggList.appendChild(eggElement);
    });
  },

  // Afficher les photos
  renderPhotos() {
    const photosList = this.elements.photosList;
    photosList.innerHTML = "";

    if (!appState.photos || appState.photos.length === 0) {
      photosList.innerHTML =
        "<p class='text-center'>Aucune photo sauvegardée.</p>";
      return;
    }

    appState.photos.forEach((photo, index) => {
      const photoElement = document.createElement("div");
      photoElement.className = "photo-item";

      photoElement.innerHTML = `
        <img src="${
          photo.image || photo.dataUrl
        }" alt="Photo de Pokémon" class="photo-img">
        <div class="photo-info">
          <p>Photo avec ${utils.capitalizeFirstLetter(photo.pokemon.name)}</p>
        </div>
      `;

      photoElement.addEventListener("click", () =>
        this.showPhotoDetails(photo)
      );
      photosList.appendChild(photoElement);
    });
  },

  // Afficher la sélection de Pokémon pour les photos
  renderPokemonSelectionForPhotos() {
    const photoPokemonSelection = this.elements.photoPokemonSelection;
    photoPokemonSelection.innerHTML = "";

    if (appState.pokemons.length === 0) {
      photoPokemonSelection.innerHTML =
        "<p class='text-center'>Capturez des Pokémon pour prendre des photos avec eux.</p>";
      return;
    }

    appState.pokemons.forEach((pokemon) => {
      const pokemonOption = document.createElement("div");
      pokemonOption.className = "pokemon-option";

      pokemonOption.innerHTML = `
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
      `;

      pokemonOption.addEventListener("click", () => {
        document
          .querySelectorAll(".pokemon-option")
          .forEach((el) => el.classList.remove("selected"));
        pokemonOption.classList.add("selected");
        appState.selectedPokemonId = pokemon.id;
        window.photoController.selectPokemonForPhoto(pokemon);
      });
      photoPokemonSelection.appendChild(pokemonOption);
    });
  },

  // Afficher les détails d'un Pokémon
  showPokemonDetails(pokemon) {
    this.elements.modalPokemonName.textContent = utils.capitalizeFirstLetter(
      pokemon.name
    );
    this.elements.modalPokemonImage.src = pokemon.sprites.front_default;

    // Récupérer plus d'informations sur l'espèce du Pokémon
    fetch(pokemon.species.url)
      .then((response) => response.json())
      .then((speciesData) => {
        // Trouver une description en français
        const frDescription = speciesData.flavor_text_entries.find(
          (entry) => entry.language.name === "fr"
        );

        const description = frDescription
          ? frDescription.flavor_text
          : "Aucune information disponible en français.";

        this.elements.modalPokemonInfo.innerHTML = `
          <p class="pokemon-description">${description}</p>
          <div class="pokemon-stats">
            <p><strong>Taille:</strong> ${pokemon.height / 10} m</p>
            <p><strong>Poids:</strong> ${pokemon.weight / 10} kg</p>
            <p><strong>Types:</strong> ${pokemon.types
              .map((t) => utils.capitalizeFirstLetter(t.type.name))
              .join(", ")}</p>
          </div>
          <div class="pokemon-abilities">
            <p><strong>Capacités:</strong> ${pokemon.abilities
              .map((a) => utils.capitalizeFirstLetter(a.ability.name))
              .join(", ")}</p>
          </div>
          <div class="pokemon-rarity-info">
            <p><strong>Rareté:</strong> ${utils.capitalizeFirstLetter(
              pokemon.rarity || "common"
            )}</p>
          </div>
        `;

        this.elements.modal.classList.add("active");
      })
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération des détails de l'espèce:",
          error
        );

        // Afficher des informations de base si l'API ne répond pas
        this.elements.modalPokemonInfo.innerHTML = `
          <div class="pokemon-stats">
            <p><strong>Taille:</strong> ${pokemon.height / 10} m</p>
            <p><strong>Poids:</strong> ${pokemon.weight / 10} kg</p>
            <p><strong>Types:</strong> ${pokemon.types
              .map((t) => utils.capitalizeFirstLetter(t.type.name))
              .join(", ")}</p>
            <p><strong>Rareté:</strong> ${utils.capitalizeFirstLetter(
              pokemon.rarity || "common"
            )}</p>
          </div>
        `;

        this.elements.modal.classList.add("active");
      });
  },

  // Afficher les détails d'une photo
  showPhotoDetails(photo) {
    this.elements.modalPokemonName.textContent =
      "Photo avec " + utils.capitalizeFirstLetter(photo.pokemon.name);
    this.elements.modalPokemonImage.src = photo.image || photo.dataUrl;
    this.elements.modalPokemonInfo.innerHTML = `
      <p>Date: ${new Date(photo.date).toLocaleDateString()}</p>
    `;
    this.elements.modal.classList.add("active");
  },

  // Fermer la modal
  closeModal() {
    this.elements.modal.classList.remove("active");
  },

  // Afficher le loader
  showLoader() {
    this.elements.loader.classList.add("active");
  },

  // Cacher le loader
  hideLoader() {
    this.elements.loader.classList.remove("active");
  },

  // Afficher une notification
  showNotification(message) {
    this.elements.notification.textContent = message;
    this.elements.notification.classList.add("active");

    setTimeout(() => {
      this.elements.notification.classList.remove("active");
    }, 3000);
  },
};

// Initialiser l'interface utilisateur
export function initUI() {
  window.uiController.init();
}
