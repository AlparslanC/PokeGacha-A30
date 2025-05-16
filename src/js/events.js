// events.js - Gestion des événements

import appState from "./app-state.js";
import { pokemonService } from "./pokemon-service.js";
import { photoController } from "./photo-controller.js";

// Initialiser les écouteurs d'événements
export function initEvents() {
  // Éléments du DOM pour les événements
  const openPokeballBtn = document.getElementById("open-pokeball");
  const tabs = document.querySelectorAll(".tab");
  const modalClose = document.getElementById("modal-close");
  const modal = document.getElementById("pokemon-modal");
  const takePictureBtn = document.getElementById("take-photo");

  // Événement pour ouvrir une Pokéball
  openPokeballBtn.addEventListener("click", () =>
    pokemonService.openPokeball()
  );

  // Événements pour les onglets
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;

      // Désactiver tous les onglets et contenus
      tabs.forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));

      // Activer l'onglet et le contenu sélectionnés
      tab.classList.add("active");
      document.getElementById(tabName).classList.add("active");

      // Initialiser la caméra si l'onglet Photos est sélectionné
      if (tabName === "photos") {
        photoController.initCamera();
      } else if (appState.cameraStream) {
        // Arrêter la caméra si on change d'onglet
        photoController.stopCamera();
      }
    });
  });

  // Événement pour fermer la modale
  modalClose.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  // Fermer la modale en cliquant à l'extérieur
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("active");
    }
  });

  // Événement pour prendre une photo
  takePictureBtn.addEventListener("click", () => photoController.takePhoto());
}
