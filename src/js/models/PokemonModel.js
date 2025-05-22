class PokemonModel {
  constructor() {
    this.baseUrl = "https://pokeapi.co/api/v2/pokemon/";
  }

  async fetchRandomPokemon() {
    const randomId = Math.floor(Math.random() * 1025) + 1;

    try {
      const response = await fetch(`${this.baseUrl}${randomId}`);
      if (!response.ok) {
        throw new Error("Erreur réseau lors de la récupération des données.");
      }

      const pokemon = await response.json();

      // Ajouter les types
      pokemon.allTypes = pokemon.types.map((t) => t.type.name);
      pokemon.mainType = pokemon.allTypes[0] || "unknown";

      return pokemon;
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      throw error;
    }
  }

  async fetchPokemonSpecies(speciesUrl) {
    try {
      const response = await fetch(speciesUrl);
      if (!response.ok) {
        throw new Error(
          "Erreur lors de la récupération des détails de l'espèce"
        );
      }
      return await response.json();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des détails de l'espèce:",
        error
      );
      throw error;
    }
  }
}
