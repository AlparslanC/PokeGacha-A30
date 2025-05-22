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
      this.elements.notification.classList.add("active");

      setTimeout(() => {
        this.elements.notification.classList.remove("active");
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
}
