// views/PhotoCollectionView.js - Vue pour la collection de photos
class PhotoCollectionView extends BaseView {
  constructor(container) {
    super(container);
    this.onPhotoClick = null;
  }

  render(photos) {
    this.clearContainer();

    if (!photos || photos.length === 0) {
      this.container.innerHTML =
        "<p class='text-center'>Aucune photo sauvegardée.</p>";
      return;
    }

    photos.forEach((photo, index) => {
      const photoCard = this.createPhotoCard(photo, index);
      this.container.appendChild(photoCard);
    });
  }

  createPhotoCard(photo, index) {
    const card = this.createElement("div", "photo-item");

    card.innerHTML = `
        <img src="${
          photo.image || photo.dataUrl
        }" alt="Photo de Pokémon" class="photo-img">
        <div class="photo-info">
          <p>Photo avec ${this.capitalizeFirstLetter(photo.pokemon.name)}</p>
        </div>
      `;

    this.bindEvent(card, "click", () => {
      if (this.onPhotoClick) {
        this.onPhotoClick(photo);
      }
    });

    return card;
  }

  setOnPhotoClick(callback) {
    this.onPhotoClick = callback;
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
