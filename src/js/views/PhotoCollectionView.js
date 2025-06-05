// views/PhotoCollectionView.js - Vue pour la collection de photos
class PhotoCollectionView extends BaseView {
  constructor(container) {
    super(container);
    this.onPhotoClick = null;
  }

  render(photos) {
    this.clear();

    if (photos.length === 0) {
      this.container.innerHTML = "<p class='text-center'>Aucune photo prise pour l'instant.</p>";
      return;
    }

    photos.forEach(photo => {
      const card = this.createPhotoCard(photo);
      this.container.appendChild(card);
    });
  }

  createPhotoCard(photo) {
    const card = this.createElement("div", "photo-card");
    
    const image = this.createElement("img", "photo-image");
    image.src = photo.image || photo.dataUrl;
    image.alt = "Photo avec " + photo.pokemon.name;
    
    const info = this.createElement("div", "photo-info");
    info.textContent = new Date(photo.date).toLocaleDateString();
    
    card.appendChild(image);
    card.appendChild(info);
    
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
