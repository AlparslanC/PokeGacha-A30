// views/EggCollectionView.js - Vue pour la collection d'œufs
class EggCollectionView extends BaseView {
  constructor(container) {
    super(container);
    this.onIncubateClick = null;
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
        <div class="egg-progress">
          <div class="egg-progress-bar" style="width: ${
            progress.progress
          }%;"></div>
          <div class="egg-progress-text">${Math.floor(progress.progress)}%</div>
        </div>
        <div class="egg-times"></div>
        <button class="incubate-btn">Réchauffer</button>
      `;

    const incubateBtn = card.querySelector(".incubate-btn");
    this.bindEvent(incubateBtn, "click", (e) => {
      e.stopPropagation();
      if (this.onIncubateClick) {
        this.onIncubateClick(index);
      }
    });

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
      } else {
        eggCard.classList.remove("egg-ready");
      }
    });
  }

  setOnIncubateClick(callback) {
    this.onIncubateClick = callback;
  }
}
