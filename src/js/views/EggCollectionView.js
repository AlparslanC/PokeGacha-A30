// views/EggCollectionView.js - Vue pour la collection d'œufs
class EggCollectionView extends BaseView {
  constructor(container) {
    super(container);
    this.onIncubateClick = null;
    this.onHatchClick = null;
    this.onShakeModeClick = null;
  }

  render(eggs, progressData) {
    this.clearContainer();

    if (eggs.length === 0) {
      this.container.innerHTML =
        "<p class='text-center'>Vous n'avez pas d'œufs pour le moment.</p>";
      return;
    }

    eggs.forEach((egg, index) => {
      const eggCard = this.createEggCard(egg, index, progressData[index]);
      this.container.appendChild(eggCard);
    });
  }

  createEggCard(egg, index, progress) {
    const card = this.createElement("div", "egg-card");
    card.dataset.index = index;

    if (progress.isReady) {
      card.classList.add("egg-ready");
    }

    card.innerHTML = `
        <img src="images/egg.png" alt="Œuf de Pokémon" class="egg-image">
        <div class="egg-progress-container">
          <div class="egg-progress-bar" style="width: ${progress.progress}%;"></div>
          <div class="egg-progress-text">${Math.floor(progress.progress)}%</div>
        </div>
        <div class="egg-actions">
          ${progress.isReady 
            ? '<button class="hatch-btn">Faire éclore</button>' 
            : '<button class="shake-btn">Activer le secouement</button>'}
        </div>
      `;

    if (progress.isReady) {
      const hatchBtn = card.querySelector(".hatch-btn");
      this.bindEvent(hatchBtn, "click", (e) => {
        e.stopPropagation();
        if (this.onHatchClick) {
          this.onHatchClick(index);
        }
      });
    } else {
      const shakeBtn = card.querySelector(".shake-btn");
      this.bindEvent(shakeBtn, "click", (e) => {
        e.stopPropagation();
        if (this.onShakeModeClick) {
          const isActive = this.onShakeModeClick(index);
          if (isActive) {
            shakeBtn.classList.add('active');
            shakeBtn.textContent = 'Désactiver le secouement';
            shakeBtn.dataset.active = 'true';
          } else {
            shakeBtn.classList.remove('active');
            shakeBtn.textContent = 'Activer le secouement';
            shakeBtn.dataset.active = 'false';
          }
        }
      });
    }

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
      } else {
        eggCard.classList.remove("egg-ready");
        const actionsDiv = eggCard.querySelector(".egg-actions");
        if (actionsDiv) {
          const currentButton = actionsDiv.querySelector(".shake-btn");
          if (!currentButton) {
            // Si le bouton n'existe pas, le créer
            actionsDiv.innerHTML = '<button class="shake-btn">Activer le secouement</button>';
            const shakeBtn = actionsDiv.querySelector(".shake-btn");
            this.bindEvent(shakeBtn, "click", (e) => {
              e.stopPropagation();
              if (this.onShakeModeClick) {
                const isActive = this.onShakeModeClick(index);
                if (isActive) {
                  shakeBtn.classList.add('active');
                  shakeBtn.textContent = 'Désactiver le secouement';
                  shakeBtn.dataset.active = 'true';
                } else {
                  shakeBtn.classList.remove('active');
                  shakeBtn.textContent = 'Activer le secouement';
                  shakeBtn.dataset.active = 'false';
                }
              }
            });
          }
          // Ne rien faire si le bouton existe déjà - préserver son état
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
