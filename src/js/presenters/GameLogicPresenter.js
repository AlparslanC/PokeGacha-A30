// presenters/GameLogicPresenter.js - Logique de jeu
class GameLogicPresenter {
  constructor(appStateModel, pokemonModel, eggModel, uiView) {
    this.appStateModel = appStateModel;
    this.pokemonModel = pokemonModel;
    this.eggModel = eggModel;
    this.uiView = uiView;
  }

  async openPokeball() {
    if (this.appStateModel.getUserPokeballs() <= 0) {
      this.uiView.showNotification("Vous n'avez plus de Pokéball !");
      return;
    }

    this.appStateModel.decrementPokeballs();
    this.uiView.animatePokeball();
    this.uiView.showLoader();

    // Déterminer si on obtient un Pokémon ou un œuf (70% Pokémon, 30% œuf)
    const isPokemon = Math.random() < 0.7;

    try {
      if (isPokemon) {
        const pokemon = await this.pokemonModel.fetchRandomPokemon();
        this.appStateModel.addPokemon(pokemon);
        this.uiView.hideLoader();
        this.uiView.showNotification(
          `Vous avez capturé un ${this.capitalizeFirstLetter(pokemon.name)} !`
        );
        // La modal sera gérée par le MainPresenter via showPokemonDetails
      } else {
        // Créer un œuf
        setTimeout(() => {
          const newEgg = this.eggModel.createEgg();
          this.appStateModel.addEgg(newEgg);
          this.uiView.hideLoader();
          this.uiView.showNotification("Vous avez trouvé un œuf !");
        }, 1000);
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la Pokéball:", error);
      this.uiView.hideLoader();
      this.uiView.showNotification("Erreur lors de la capture.");
    }
  }

  incubateEgg(index) {
    const eggs = this.appStateModel.getEggs();
    const egg = eggs[index];

    if (egg) {
      const updatedEgg = this.eggModel.incubateEgg({ ...egg });
      this.appStateModel.updateEgg(index, updatedEgg);
      this.uiView.showNotification("Vous avez réchauffé l'œuf !");
    }
  }

  async hatchEgg(index) {
    const eggs = this.appStateModel.getEggs();
    const egg = eggs[index];

    if (!egg.hatched) {
      try {
        const pokemon = await this.pokemonModel.fetchRandomPokemon();
        this.appStateModel.addPokemon(pokemon);
        this.appStateModel.removeEgg(index);
        this.uiView.showNotification(
          `Un ${this.capitalizeFirstLetter(pokemon.name)} est né !`
        );
      } catch (error) {
        console.error("Erreur lors de l'éclosion:", error);
        this.uiView.showNotification("Erreur lors de l'éclosion de l'œuf.");
      }
    }
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
