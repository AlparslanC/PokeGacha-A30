// models/ShopModel.js
class ShopModel {
  constructor(appStateModel, pokemonModel) {
    this.appStateModel = appStateModel;
    this.pokemonModel = pokemonModel;
  }

  async buyPokeball() {
    const cost = 10;
    if (this.appStateModel.getCandyCount() >= cost) {
      if (this.appStateModel.getUserPokeballs() >= this.appStateModel.maxPokeballs) {
        throw new Error("Vous avez déjà le maximum de Pokéballs !");
      }
      this.appStateModel.decrementCandyCount(cost);
      this.appStateModel.incrementPokeballs();
      return { success: true, message: "Vous avez acheté une Pokéball !" };
    }
    throw new Error("Pas assez de bonbons !");
  }

  async buyShinyPokemon() {
    const cost = 1000;
    if (this.appStateModel.getCandyCount() >= cost) {
      try {
        // Obtenir un Pokémon aléatoire
        const randomId = Math.floor(Math.random() * 1025) + 1;
        const pokemon = await this.pokemonModel.fetchPokemonById(randomId);
        
        if (!pokemon || !pokemon.sprites || !pokemon.sprites.front_shiny) {
          throw new Error("Ce Pokémon n'est pas disponible en version shiny !");
        }

        // Déduire les bonbons avant d'ajouter le Pokémon
        this.appStateModel.decrementCandyCount(cost);
        
        // Créer une copie du Pokémon avec les propriétés shiny
        const shinyPokemon = {
          ...pokemon,
          isShiny: true,
          sprites: {
            front_default: pokemon.sprites.front_shiny,
            front_shiny: pokemon.sprites.front_shiny
          }
        };
        
        // Ajouter le Pokémon shiny à la collection
        this.appStateModel.addPokemon(shinyPokemon);
        
        const pokemonName = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
        return { 
          success: true, 
          message: `Vous avez obtenu un ${pokemonName} shiny !`,
          pokemon: shinyPokemon
        };
      } catch (error) {
        console.error("Erreur lors de l'obtention du Pokémon shiny:", error);
        throw new Error("Erreur lors de l'obtention du Pokémon shiny. Veuillez réessayer !");
      }
    }
    throw new Error("Pas assez de bonbons !");
  }
} 