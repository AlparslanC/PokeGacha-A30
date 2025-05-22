// presenters/PhotoPresenter.js - Gestion des photos
class PhotoPresenter {
  constructor(appStateModel, uiView) {
    this.appStateModel = appStateModel;
    this.uiView = uiView;
    this.setupPhotoEvents();
  }

  setupPhotoEvents() {
    const takePictureBtn = document.getElementById("take-photo");
    if (takePictureBtn) {
      takePictureBtn.addEventListener("click", () => this.takePhoto());
    }
  }

  async initCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        this.appStateModel.setCameraStream(stream);
        const cameraView = document.getElementById("camera-view");
        if (cameraView) {
          cameraView.srcObject = stream;
        }

        // Afficher le conteneur de photo
        if (this.uiView.elements.photoContainer) {
          this.uiView.elements.photoContainer.style.display = "flex";
        }

        this.renderPokemonSelection();
      } catch (error) {
        console.error("Erreur lors de l'accès à la caméra:", error);
        this.uiView.showNotification("Impossible d'accéder à la caméra.");
      }
    } else {
      this.uiView.showNotification(
        "Votre appareil ne supporte pas l'accès à la caméra."
      );
    }
  }

  stopCamera() {
    const stream = this.appStateModel.getCameraStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.appStateModel.setCameraStream(null);
    }
  }

  renderPokemonSelection() {
    const container = this.uiView.elements.photoPokemonSelection;
    if (!container) return;

    container.innerHTML = "";
    const pokemons = this.appStateModel.getPokemons();

    if (pokemons.length === 0) {
      container.innerHTML =
        "<p class='text-center'>Capturez des Pokémon pour prendre des photos avec eux.</p>";
      return;
    }

    pokemons.forEach((pokemon) => {
      const pokemonOption = document.createElement("div");
      pokemonOption.className = "pokemon-option";

      pokemonOption.innerHTML = `
          <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        `;

      pokemonOption.addEventListener("click", () => {
        // Désélectionner les autres options
        container
          .querySelectorAll(".pokemon-option")
          .forEach((el) => el.classList.remove("selected"));

        // Sélectionner cette option
        pokemonOption.classList.add("selected");
        this.appStateModel.setSelectedPokemonForPhoto(pokemon);
      });

      container.appendChild(pokemonOption);
    });
  }

  takePhoto() {
    const selectedPokemon = this.appStateModel.getSelectedPokemonForPhoto();

    if (!selectedPokemon) {
      this.uiView.showNotification(
        "Veuillez sélectionner un Pokémon d'abord !"
      );
      return;
    }

    const cameraView = document.getElementById("camera-view");
    const cameraCanvas = document.getElementById("camera-canvas");

    if (!cameraView || !cameraCanvas) {
      this.uiView.showNotification("Erreur: éléments caméra non trouvés.");
      return;
    }

    const context = cameraCanvas.getContext("2d");
    cameraCanvas.width = cameraView.videoWidth;
    cameraCanvas.height = cameraView.videoHeight;

    // Dessiner l'image de la caméra
    context.drawImage(
      cameraView,
      0,
      0,
      cameraCanvas.width,
      cameraCanvas.height
    );

    // Dessiner le Pokémon sur l'image
    const pokemonImg = new Image();
    pokemonImg.src = selectedPokemon.sprites.front_default;

    pokemonImg.onload = () => {
      // Dessiner le Pokémon au centre
      const scale = 2;
      const posX = (cameraCanvas.width - pokemonImg.width * scale) / 2;
      const posY = (cameraCanvas.height - pokemonImg.height * scale) / 2;

      context.drawImage(
        pokemonImg,
        posX,
        posY,
        pokemonImg.width * scale,
        pokemonImg.height * scale
      );

      // Enregistrer la photo
      const photoData = cameraCanvas.toDataURL("image/png");
      const photo = {
        id: Date.now(),
        image: photoData,
        pokemon: selectedPokemon,
        date: new Date().toISOString(),
      };

      this.appStateModel.addPhoto(photo);
      this.uiView.showNotification("Photo prise avec succès !");
    };

    pokemonImg.onerror = () => {
      this.uiView.showNotification(
        "Erreur lors du chargement de l'image du Pokémon."
      );
    };
  }
}
