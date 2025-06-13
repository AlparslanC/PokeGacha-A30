class PokemonModel {
  constructor() {
    this.baseUrl = "https://pokeapi.co/api/v2/pokemon/";
    this.shinyRate = 1/4096; // Taux standard de shiny dans les jeux Pokémon
    this.totalPokemon = 1025; // Limité à la première génération
  }

  async fetchRandomPokemon() {
    const id = Math.floor(Math.random() * this.totalPokemon) + 1;
    return this.fetchPokemonById(id);
  }

  async fetchPokemonById(id) {
    try {
      const response = await fetch(`${this.baseUrl}${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Ajouter la propriété isShiny avec 1/4096 de chance
      data.isShiny = Math.random() < 1/4096;
      
      // Si le Pokémon est shiny, utiliser le sprite shiny
      if (data.isShiny && data.sprites.front_shiny) {
        data.sprites.front_default = data.sprites.front_shiny;
      }
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération du Pokémon:', error);
      throw error;
    }
  }

  async getSpeciesData(pokemonNameOrId) {
    try {
      const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${pokemonNameOrId.toLowerCase()}`;
      const response = await fetch(speciesUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Species fetch failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getEvolutionChain(evolutionChainUrl) {
    try {
      const response = await fetch(evolutionChainUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Evolution chain fetch failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getNextEvolution(pokemon) {
    try {
      // Step 1: Get species data
      const speciesData = await this.getSpeciesData(pokemon.name);
      
      if (!speciesData.evolution_chain?.url) {
        throw new Error("Evolution chain URL is missing from species data");
      }

      // Step 2: Get evolution chain
      const evolutionData = await this.getEvolutionChain(speciesData.evolution_chain.url);
      
      // Step 3: Find current Pokemon in evolution chain and get next evolution
      let chain = evolutionData.chain;
      let nextEvolution = null;
      let foundCurrent = false;

      // Helper function to search the evolution chain
      const findPokemonInChain = (chain, targetName) => {
        if (chain.species.name === targetName) {
          foundCurrent = true;
          if (chain.evolves_to.length > 0) {
            nextEvolution = chain.evolves_to[0].species;
          }
          return true;
        }

        for (const evolution of chain.evolves_to) {
          if (findPokemonInChain(evolution, targetName)) {
            return true;
          }
        }
        return false;
      };

      // Search for the Pokemon in the evolution chain
      findPokemonInChain(chain, pokemon.name);

      if (!foundCurrent || !nextEvolution) {
        return null;
      }

      // Step 4: Get the evolved Pokemon's full data
      const evolvedPokemonId = nextEvolution.url.split('/').slice(-2, -1)[0];
      const response = await fetch(`${this.baseUrl}${evolvedPokemonId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch evolved Pokemon: ${response.status} ${response.statusText}`);
      }

      const evolvedPokemon = await response.json();
      evolvedPokemon.isShiny = false; // Evolution is never shiny

      // Add species data to evolved Pokemon
      evolvedPokemon.species = {
        name: evolvedPokemon.name,
        url: `https://pokeapi.co/api/v2/pokemon-species/${evolvedPokemonId}/`
      };
      
      // Générer un uniqueId pour le Pokémon évolué
      evolvedPokemon.uniqueId = `${evolvedPokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`Pokémon évolué ${evolvedPokemon.name} avec uniqueId: ${evolvedPokemon.uniqueId}`);

      return evolvedPokemon;
    } catch (error) {
      throw error;
    }
  }

  // Méthode pour obtenir une taille par défaut basée sur la génération
  getDefaultHeight(pokemonId) {
    // Tailles moyennes par génération (en décimètres)
    const generationHeights = {
      1: 10,  // Génération 1 (1-151) ~ 1.0m
      2: 11,  // Génération 2 (152-251) ~ 1.1m
      3: 12,  // Génération 3 (252-386) ~ 1.2m
      4: 13,  // Génération 4 (387-493) ~ 1.3m
      5: 14,  // Génération 5 (494-649) ~ 1.4m
      6: 15,  // Génération 6 (650-721) ~ 1.5m
      7: 16,  // Génération 7 (722-809) ~ 1.6m
      8: 17,  // Génération 8 (810-898) ~ 1.7m
      9: 18   // Génération 9 (899+) ~ 1.8m
    };

    // Déterminer la génération basée sur l'ID
    let generation = 1;
    if (pokemonId > 898) generation = 9;
    else if (pokemonId > 809) generation = 8;
    else if (pokemonId > 721) generation = 7;
    else if (pokemonId > 649) generation = 6;
    else if (pokemonId > 493) generation = 5;
    else if (pokemonId > 386) generation = 4;
    else if (pokemonId > 251) generation = 3;
    else if (pokemonId > 151) generation = 2;

    return generationHeights[generation];
  }

  // Méthode pour obtenir un poids par défaut basé sur la génération
  getDefaultWeight(pokemonId) {
    // Poids moyens par génération (en hectogrammes)
    const generationWeights = {
      1: 400,  // Génération 1 (1-151)
      2: 450,  // Génération 2 (152-251)
      3: 500,  // Génération 3 (252-386)
      4: 550,  // Génération 4 (387-493)
      5: 600,  // Génération 5 (494-649)
      6: 650,  // Génération 6 (650-721)
      7: 700,  // Génération 7 (722-809)
      8: 750,  // Génération 8 (810-898)
      9: 800   // Génération 9 (899+)
    };

    // Déterminer la génération basée sur l'ID
    let generation = 1;
    if (pokemonId > 898) generation = 9;
    else if (pokemonId > 809) generation = 8;
    else if (pokemonId > 721) generation = 7;
    else if (pokemonId > 649) generation = 6;
    else if (pokemonId > 493) generation = 5;
    else if (pokemonId > 386) generation = 4;
    else if (pokemonId > 251) generation = 3;
    else if (pokemonId > 151) generation = 2;

    return generationWeights[generation];
  }

  async fetchPokemonSpecies(url) {
    if (!url) {
      console.warn("URL de l'espèce manquante, tentative de récupération à partir du nom");
      throw new Error("URL de l'espèce non spécifiée");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Erreur réseau: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La réponse n'est pas au format JSON");
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error("La requête a dépassé le délai d'attente");
      }
      console.error(
        "Erreur lors de la récupération des détails de l'espèce:",
        error
      );
      throw error;
    }
  }
}
