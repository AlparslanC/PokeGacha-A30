// views/EggCollectionView.js - Vue pour la collection d'œufs
class EggCollectionView extends BaseView {
  constructor(container, appStateModel, uiView) {
    super(container);
    this.appStateModel = appStateModel;
    this.uiView = uiView;
    this.onIncubateClick = null;
    this.onHatchClick = null;
    this.onShakeModeClick = null;
    this.activeShakeIndex = null; // Nouvel attribut pour suivre l'œuf en mode secouement
  }

  render(eggs, progressData) {
    this.clear();

    if (!eggs || eggs.length === 0) {
      this.container.innerHTML =
        "<p class='text-center'>Vous n'avez pas d'œufs pour le moment.</p>";
      return;
    }

    eggs.forEach((egg, index) => {
      if (!progressData || !progressData[index]) {
        console.error('Données de progression manquantes pour l\'œuf', index);
        return;
      }
      const card = this.createEggCard(egg, index, progressData[index]);
      this.container.appendChild(card);
    });
  }

  createEggCard(egg, index, progress) {
    if (!egg || !progress) {
      console.error('Données manquantes pour la création de la carte d\'œuf', { egg, index, progress });
      return null;
    }

    const card = this.createElement("div", "egg-card");
    card.dataset.index = index;

    const imageContainer = this.createElement("div", "egg-image-container");

    // Image de l'œuf
    const image = this.createElement("img");
    image.src = "images/egg.png";
    image.alt = "Œuf Pokémon";

    // Si c'est un œuf d'accouplement, ajouter le style spécial et l'icône du parent
    if (egg.isBreedingEgg && egg.parentPokemon) {
      card.classList.add("breeding-egg");
      
      // Créer le conteneur pour l'icône du parent
      const parentOverlay = this.createElement("div", "parent-pokemon-overlay");
      const parentIcon = this.createElement("img", "parent-pokemon-icon");
      parentIcon.src = egg.parentPokemon.sprites.front_default;
      parentIcon.alt = egg.parentPokemon.name ? this.capitalizeFirstLetter(egg.parentPokemon.name) : 'Pokemon Parent';
      
      parentOverlay.appendChild(parentIcon);
      imageContainer.appendChild(parentOverlay);

      // Ajouter le tag "Œuf d'accouplement"
      const breedingTag = this.createElement("div", "breeding-tag", "Œuf d'accouplement");
      card.appendChild(breedingTag);
    }

    imageContainer.appendChild(image);
    card.appendChild(imageContainer);

    // Barre de progression
    const progressContainer = this.createElement("div", "egg-progress-container");
    const progressBar = this.createElement("div", "egg-progress-bar");
    progressBar.style.width = `${progress.progress}%`;
    const progressText = this.createElement("div", "egg-progress-text", `${Math.floor(progress.progress)}%`);
    
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    card.appendChild(progressContainer);

    // Bouton d'action (Secouer ou Faire éclore)
    const actionsDiv = this.createElement("div", "egg-actions");
    
    if (progress.isReady) {
      const hatchButton = this.createElement("button", "hatch-btn", "Faire éclore");
      this.bindEvent(hatchButton, "click", (e) => {
        e.stopPropagation();
        if (this.onHatchClick) {
          this.onHatchClick(index);
        }
      });
      actionsDiv.appendChild(hatchButton);
      card.classList.add("egg-ready");
    } else {
      const shakeButton = this.createElement("button", "shake-btn", "Secouer");
      // Vérifier si cet œuf est actuellement en mode secouement
      if (this.activeShakeIndex === index) {
        shakeButton.classList.add('active');
        shakeButton.textContent = 'Désactiver le secouement';
      }
      this.bindEvent(shakeButton, "click", (e) => {
        e.stopPropagation();
        if (this.onShakeModeClick) {
          const isActive = this.onShakeModeClick(index);
          if (isActive) {
            this.activeShakeIndex = index;
            shakeButton.classList.add('active');
            shakeButton.textContent = 'Désactiver le secouement';
          } else {
            this.activeShakeIndex = null;
            shakeButton.classList.remove('active');
            shakeButton.textContent = 'Secouer';
          }
        }
      });
      actionsDiv.appendChild(shakeButton);
    }
    
    card.appendChild(actionsDiv);

    return card;
  }

  updateProgress(eggs, progressData) {
    eggs.forEach((egg, index) => {
      const eggCard = this.container.querySelector(
        `.egg-card[data-index="${index}"]`
      );
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

      // Gérer le changement d'état quand l'œuf est prêt
      if (progress.isReady) {
        eggCard.classList.add("egg-ready");
        const actionsDiv = eggCard.querySelector(".egg-actions");
        if (actionsDiv) {
          actionsDiv.innerHTML = '<button class="hatch-btn">Faire éclore</button>';
          const newHatchBtn = actionsDiv.querySelector(".hatch-btn");
          this.bindEvent(newHatchBtn, "click", (e) => {
            e.stopPropagation();
            if (this.onHatchClick) {
              this.onHatchClick(index);
            }
          });
        }
        // Réinitialiser l'index actif si cet œuf était en mode secouement
        if (this.activeShakeIndex === index) {
          this.activeShakeIndex = null;
        }
      } else {
        eggCard.classList.remove("egg-ready");
        const actionsDiv = eggCard.querySelector(".egg-actions");
        if (actionsDiv) {
          let shakeBtn = actionsDiv.querySelector(".shake-btn");
          
          // Si le bouton n'existe pas, le créer
          if (!shakeBtn) {
            actionsDiv.innerHTML = '<button class="shake-btn">Secouer</button>';
            shakeBtn = actionsDiv.querySelector(".shake-btn");
            
            // Si cet œuf est en mode secouement actif, mettre à jour l'apparence du bouton
            if (this.activeShakeIndex === index) {
              shakeBtn.classList.add('active');
              shakeBtn.textContent = 'Désactiver le secouement';
            }
            
            this.bindEvent(shakeBtn, "click", (e) => {
              e.stopPropagation();
              if (this.onShakeModeClick) {
                const isActive = this.onShakeModeClick(index);
                if (isActive) {
                  this.activeShakeIndex = index;
                  shakeBtn.classList.add('active');
                  shakeBtn.textContent = 'Désactiver le secouement';
                } else {
                  this.activeShakeIndex = null;
                  shakeBtn.classList.remove('active');
                  shakeBtn.textContent = 'Secouer';
                }
              }
            });
          } else {
            // Maintenir l'état du bouton en fonction de l'index actif
            if (this.activeShakeIndex === index) {
              shakeBtn.classList.add('active');
              shakeBtn.textContent = 'Désactiver le secouement';
            }
          }
        }
      }
    });
  }

  setOnIncubateClick(callback) {
    this.onIncubateClick = callback;
  }

  setOnHatchClick(callback) {
    this.onHatchClick = callback;
  }

  setOnShakeModeClick(callback) {
    this.onShakeModeClick = callback;
  }
}
