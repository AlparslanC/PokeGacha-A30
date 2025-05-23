// views/UIView.js - Vue principale de l'interface
class UIView extends BaseView {
  constructor() {
    super(document.body);
    this.initializeElements();
  }

  initializeElements() {
    this.elements = {
      pokeball: document.getElementById("pokeball"),
      pokeballCount: document.getElementById("pokeball-count"),
      pokemonCount: document.getElementById("pokemon-count"),
      eggCount: document.getElementById("egg-count"),
      modal: document.getElementById("pokemon-modal"),
      modalPokemonName: document.getElementById("modal-pokemon-name"),
      modalPokemonImage: document.getElementById("modal-pokemon-image"),
      modalPokemonInfo: document.getElementById("modal-pokemon-info"),
      loader: document.getElementById("loader"),
      notification: document.getElementById("notification"),
      photoPokemonSelection: document.getElementById("photo-pokemon-selection"),
      photoContainer: document.querySelector(".photo-container"),
      rewardModal: document.getElementById("reward-modal"),
    };
  }

  updateCounters(pokeballs, pokemonCount, eggCount) {
    if (this.elements.pokeballCount) {
      this.elements.pokeballCount.textContent = pokeballs;
    }
    if (this.elements.pokemonCount) {
      this.elements.pokemonCount.textContent = pokemonCount;
    }
    if (this.elements.eggCount) {
      this.elements.eggCount.textContent = eggCount;
    }
  }

  showLoader() {
    if (this.elements.loader) {
      this.elements.loader.classList.add("active");
    }
  }

  hideLoader() {
    if (this.elements.loader) {
      this.elements.loader.classList.remove("active");
    }
  }

  showNotification(message) {
    if (this.elements.notification) {
      this.elements.notification.textContent = message;
      this.elements.notification.classList.add("show");

      setTimeout(() => {
        this.elements.notification.classList.remove("show");
      }, 3000);
    }
  }

  showModal() {
    if (this.elements.modal) {
      this.elements.modal.classList.add("active");
    }
  }

  hideModal() {
    if (this.elements.modal) {
      this.elements.modal.classList.remove("active");
    }
  }

  updateModalContent(title, imageSrc, content) {
    if (this.elements.modalPokemonName) {
      this.elements.modalPokemonName.textContent = title;
    }
    if (this.elements.modalPokemonImage) {
      this.elements.modalPokemonImage.src = imageSrc;
    }
    if (this.elements.modalPokemonInfo) {
      this.elements.modalPokemonInfo.innerHTML = content;
    }
  }

  animatePokeball() {
    if (this.elements.pokeball) {
      this.elements.pokeball.classList.add("open");
      setTimeout(() => {
        this.elements.pokeball.classList.remove("open");
      }, 1000);
    }
  }

  showRewardModal(title, imageSrc, message) {
    if (!this.elements.rewardModal) {
      // Créer la modal si elle n'existe pas
      const modal = document.createElement("div");
      modal.id = "reward-modal";
      modal.className = "reward-modal";
      modal.innerHTML = `
        <div class="reward-content">
          <h2>${title}</h2>
          <img src="${imageSrc}" alt="${title}">
          <p>${message}</p>
          <button onclick="this.closest('.reward-modal').classList.remove('active')">Fermer</button>
        </div>
      `;
      document.body.appendChild(modal);
      this.elements.rewardModal = modal;
    } else {
      // Mettre à jour le contenu de la modal existante
      const content = this.elements.rewardModal.querySelector(".reward-content");
      content.querySelector("h2").textContent = title;
      content.querySelector("img").src = imageSrc;
      content.querySelector("p").textContent = message;
    }

    this.elements.rewardModal.classList.add("active");
  }

  hideRewardModal() {
    if (this.elements.rewardModal) {
      this.elements.rewardModal.classList.remove("active");
    }
  }
}
