// presenters/PhotoPresenter.js - Gestion des photos
class PhotoPresenter {
  constructor(appStateModel, uiView) {
    this.appStateModel = appStateModel;
    this.uiView = uiView;
    this.previewCanvas = document.getElementById('camera-canvas');
    this.previewContext = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;
    this.animationFrameId = null;
    this.pokemonImage = null;
    this.facingMode = "environment";
    this.pokemonPosition = {
      x: 0.5,
      y: 0.8
    };
    this.pokemonSize = 0.3; // Taille relative (0.1 à 0.5)
    this.setupPhotoEvents();
  }

  setupPhotoEvents() {
    const takePictureBtn = document.getElementById("take-photo");
    if (takePictureBtn) {
      takePictureBtn.addEventListener("click", () => this.takePhoto());
    }

    // Bouton de changement de caméra
    const switchCameraBtn = document.getElementById("switch-camera");
    if (switchCameraBtn) {
      switchCameraBtn.addEventListener("click", () => this.switchCamera());
    }

    // Créer et configurer le canvas de prévisualisation
    this.previewCanvas.style.position = 'absolute';
    this.previewCanvas.style.top = '0';
    this.previewCanvas.style.left = '50%';
    this.previewCanvas.style.transform = 'translateX(-50%)';
    this.previewCanvas.style.display = 'block';
    this.previewCanvas.style.pointerEvents = 'none';

    // Contrôles de position du Pokémon
    this.setupPokemonControls();
  }

  setupPokemonControls() {
    const moveStep = 0.05;
    const sizeStep = 0.05;

    document.getElementById("move-up")?.addEventListener("click", () => {
      this.pokemonPosition.y = Math.max(0.1, this.pokemonPosition.y - moveStep);
    });

    document.getElementById("move-down")?.addEventListener("click", () => {
      this.pokemonPosition.y = Math.min(0.9, this.pokemonPosition.y + moveStep);
    });

    document.getElementById("move-left")?.addEventListener("click", () => {
      this.pokemonPosition.x = Math.max(0.1, this.pokemonPosition.x - moveStep);
    });

    document.getElementById("move-right")?.addEventListener("click", () => {
      this.pokemonPosition.x = Math.min(0.9, this.pokemonPosition.x + moveStep);
    });

    // Contrôles de taille
    document.getElementById("size-up")?.addEventListener("click", () => {
      this.pokemonSize = Math.min(0.5, this.pokemonSize + sizeStep);
    });

    document.getElementById("size-down")?.addEventListener("click", () => {
      this.pokemonSize = Math.max(0.1, this.pokemonSize - sizeStep);
    });
  }

  async switchCamera() {
    this.facingMode = this.facingMode === "environment" ? "user" : "environment";
    
    // Arrêter la caméra actuelle
    this.stopCamera();
    
    // Redémarrer avec la nouvelle configuration
    await this.initCamera();
  }

  async initCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: this.facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        this.appStateModel.setCameraStream(stream);
        const cameraView = document.getElementById("camera-view");
        if (cameraView) {
          cameraView.srcObject = stream;
          cameraView.play();

          cameraView.addEventListener('loadedmetadata', () => {
            // Ajuster la taille du canvas pour correspondre à la vidéo
            const videoAspectRatio = cameraView.videoWidth / cameraView.videoHeight;
            const maxWidth = 600; // Largeur maximale définie dans le CSS
            const maxHeight = 450; // Hauteur maximale définie dans le CSS
            
            let width = maxWidth;
            let height = width / videoAspectRatio;
            
            if (height > maxHeight) {
              height = maxHeight;
              width = height * videoAspectRatio;
            }
            
            this.previewCanvas.width = width;
            this.previewCanvas.height = height;
            this.previewCanvas.style.width = width + 'px';
            this.previewCanvas.style.height = height + 'px';
            
            this.startPreviewLoop();
          });
        }

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

  updateSelectedPokemon(pokemon) {
    if (pokemon) {
      this.pokemonImage = new Image();
      this.pokemonImage.crossOrigin = "anonymous";
      this.pokemonImage.src = pokemon.sprites.front_default;
    } else {
      this.pokemonImage = null;
    }
  }

  startPreviewLoop() {
    const updatePreview = () => {
      const cameraView = document.getElementById("camera-view");
      if (!cameraView || !this.previewContext) return;

      // Effacer le canvas
      this.previewContext.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

      // Dessiner le Pokémon si sélectionné
      const selectedPokemon = this.appStateModel.getSelectedPokemonForPhoto();
      if (selectedPokemon) {
        if (!this.pokemonImage || this.pokemonImage.src !== selectedPokemon.sprites.front_default) {
          this.updateSelectedPokemon(selectedPokemon);
        }

        if (this.pokemonImage && this.pokemonImage.complete) {
          const pokemonSize = Math.min(this.previewCanvas.height, this.previewCanvas.width) * this.pokemonSize;
          const posX = (this.previewCanvas.width * this.pokemonPosition.x) - (pokemonSize / 2);
          const posY = (this.previewCanvas.height * this.pokemonPosition.y) - (pokemonSize / 2);

          if (this.facingMode === "user") {
            this.previewContext.save();
            this.previewContext.scale(-1, 1);
            this.previewContext.drawImage(
              this.pokemonImage,
              -posX - pokemonSize,
              posY,
              pokemonSize,
              pokemonSize
            );
            this.previewContext.restore();
          } else {
            this.previewContext.drawImage(
              this.pokemonImage,
              posX,
              posY,
              pokemonSize,
              pokemonSize
            );
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(updatePreview);
    };

    this.animationFrameId = requestAnimationFrame(updatePreview);
  }

  stopCamera() {
    const stream = this.appStateModel.getCameraStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.appStateModel.setCameraStream(null);
    }
    // Arrêter la boucle d'animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  renderPokemonSelection() {
    const container = this.uiView.elements.photoPokemonSelection;
    if (!container) return;

    container.innerHTML = "";
    const pokemons = this.appStateModel.getPokemons();

    if (pokemons.length === 0) {
      container.innerHTML = "<p class='text-center'>Capturez des Pokémon pour prendre des photos avec eux.</p>";
      return;
    }

    const selectedPokemon = this.appStateModel.getSelectedPokemonForPhoto();

    pokemons.forEach((pokemon) => {
      const pokemonOption = document.createElement("div");
      pokemonOption.className = "pokemon-option";
      
      // Vérifier si ce Pokémon est sélectionné
      if (selectedPokemon && selectedPokemon.id === pokemon.id) {
        pokemonOption.classList.add("selected");
      }

      // Utiliser l'image shiny si le Pokémon est shiny
      const imgSrc = pokemon.isShiny ? (pokemon.sprites.front_shiny || pokemon.sprites.front_default) : pokemon.sprites.front_default;
      
      pokemonOption.innerHTML = `
        <img src="${imgSrc}" alt="${pokemon.name}" title="${this.capitalizeFirstLetter(pokemon.name)}${pokemon.isShiny ? ' ✨' : ''}">
      `;

      pokemonOption.addEventListener("click", () => {
        // Désélectionner les autres options
        container.querySelectorAll(".pokemon-option").forEach(el => el.classList.remove("selected"));
        
        // Sélectionner cette option
        pokemonOption.classList.add("selected");
        this.appStateModel.setSelectedPokemonForPhoto(pokemon);
        this.updateSelectedPokemon(pokemon);
        
        // Afficher une notification de confirmation
        this.uiView.showNotification(`${this.capitalizeFirstLetter(pokemon.name)} sélectionné !`);
      });

      container.appendChild(pokemonOption);
    });
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  takePhoto() {
    const selectedPokemon = this.appStateModel.getSelectedPokemonForPhoto();

    if (!selectedPokemon) {
      this.uiView.showNotification("Veuillez sélectionner un Pokémon d'abord !");
      return;
    }

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.previewCanvas.width;
      tempCanvas.height = this.previewCanvas.height;
      const tempContext = tempCanvas.getContext('2d');

      // Dessiner la vidéo
      const cameraView = document.getElementById("camera-view");
      tempContext.drawImage(cameraView, 0, 0, tempCanvas.width, tempCanvas.height);

      // Copier le contenu du canvas de prévisualisation (le Pokémon)
      tempContext.drawImage(this.previewCanvas, 0, 0);

      // Créer la photo
      const photoData = tempCanvas.toDataURL("image/png");
      const photo = {
        id: Date.now(),
        image: photoData,
        pokemon: selectedPokemon,
        date: new Date().toISOString(),
      };

      this.appStateModel.addPhoto(photo);
      this.uiView.showNotification("Photo prise avec succès !");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la photo:", error);
      this.uiView.showNotification("Erreur lors de la sauvegarde de la photo.");
    }
  }
}
