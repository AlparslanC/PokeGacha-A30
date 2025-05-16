// photo-controller.js - Gestion des photos

import appState from "./app-state.js";

// Contrôleur de photos
export const photoController = {
  // Initialiser la caméra
  initCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          appState.cameraStream = stream;
          document.getElementById("camera-view").srcObject = stream;
          // Afficher le conteneur de photo qui est caché par défaut
          window.uiController.elements.photoContainer.style.display = "flex";
        })
        .catch((error) => {
          console.error("Erreur lors de l'accès à la caméra:", error);
          window.uiController.showNotification(
            "Impossible d'accéder à la caméra."
          );
        });
    } else {
      window.uiController.showNotification(
        "Votre appareil ne supporte pas l'accès à la caméra."
      );
    }
  },

  // Sélectionner un Pokémon pour la photo
  selectPokemonForPhoto(pokemon) {
    appState.selectedPokemonForPhoto = pokemon;

    // Mettre en évidence la sélection
    const options =
      window.uiController.elements.photoPokemonSelection.querySelectorAll(
        ".pokemon-option"
      );
    options.forEach((option) => option.classList.remove("selected"));

    // Trouver l'option correspondante au Pokémon sélectionné
    Array.from(options)
      .find((option) => option.querySelector("img").alt === pokemon.name)
      ?.classList.add("selected");
  },

  // Prendre une photo
  takePhoto() {
    if (!appState.selectedPokemonForPhoto) {
      window.uiController.showNotification(
        "Veuillez sélectionner un Pokémon d'abord !"
      );
      return;
    }

    const cameraView = document.getElementById("camera-view");
    const cameraCanvas = document.getElementById("camera-canvas");
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
    pokemonImg.src = appState.selectedPokemonForPhoto.sprites.front_default;

    pokemonImg.onload = function () {
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
      appState.photos.push({
        id: Date.now(),
        image: photoData,
        pokemon: appState.selectedPokemonForPhoto,
        date: new Date().toISOString(),
      });

      window.storageController.saveToLocalStorage();
      window.uiController.renderPhotos();
      window.uiController.showNotification("Photo prise avec succès !");
    };
  },

  // Arrêter la caméra
  stopCamera() {
    if (appState.cameraStream) {
      appState.cameraStream.getTracks().forEach((track) => track.stop());
      appState.cameraStream = null;
    }
  },
};

// Exposer le contrôleur aux autres modules
window.photoController = photoController;
