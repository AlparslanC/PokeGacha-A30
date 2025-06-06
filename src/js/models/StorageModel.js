// models/StorageModel.js - Modèle pour la persistance
class StorageModel {
    constructor() {
      this.storageKey = 'pokemon-app-data';
    }

    compressSprites(pokemon) {
      // Ne garder que l'URL de base du sprite sans les paramètres
      const cleanUrl = url => {
        if (!url) return null;
        try {
          return url.split('?')[0];
        } catch (e) {
          return url;
        }
      };

      if (!pokemon || !pokemon.sprites) {
        console.error('Pokémon invalide pour la compression des sprites:', pokemon);
        return { sprites: { front_default: null, front_shiny: null } };
      }

      return {
        ...pokemon,
        sprites: {
          front_default: cleanUrl(pokemon.sprites.front_default),
          front_shiny: pokemon.isShiny ? cleanUrl(pokemon.sprites.front_shiny) : null
        }
      };
    }

    validatePokemon(pokemon) {
      if (!pokemon) return false;
      
      // Vérifier les propriétés essentielles
      const requiredProps = ['id', 'name', 'types', 'sprites'];
      return requiredProps.every(prop => pokemon.hasOwnProperty(prop));
    }

    optimizeData(data) {
      let optimizedData = {
        pokemons: [],
        eggs: [],
        photos: [],
        userPokeballs: data?.userPokeballs !== undefined ? data.userPokeballs : 5
      };

      // Optimiser les Pokémon en ne gardant que les données essentielles
      if (Array.isArray(data?.pokemons)) {
        optimizedData.pokemons = data.pokemons
          .filter(pokemon => this.validatePokemon(pokemon))
          .map(pokemon => {
            try {
              // Extraire les types avec validation
              const types = Array.isArray(pokemon.types) 
                ? pokemon.types
                    .filter(t => t && t.type)
                    .map(t => ({
                      type: { name: t.type?.name || 'unknown' }
                    }))
                : [];
              
              const allTypes = types.map(t => t.type.name);
              const mainType = allTypes[0] || 'unknown';

              // Structure sécurisée du Pokémon
              return {
                id: pokemon.id || 0,
                name: pokemon.name || 'unknown',
                height: pokemon.height || 0,
                weight: pokemon.weight || 0,
                types: types,
                abilities: Array.isArray(pokemon.abilities) 
                  ? pokemon.abilities
                      .filter(a => a && a.ability)
                      .map(a => ({
                        ability: { name: a.ability?.name || 'unknown' }
                      }))
                  : [],
                sprites: this.compressSprites(pokemon).sprites,
                species: {
                  name: pokemon.species?.name || pokemon.name || 'unknown',
                  url: pokemon.species?.url || ''
                },
                isShiny: Boolean(pokemon.isShiny),
                allTypes: allTypes,
                mainType: mainType
              };
            } catch (error) {
              console.error('Erreur lors de l\'optimisation du Pokémon:', pokemon, error);
              return null;
            }
          })
          .filter(pokemon => pokemon !== null) // Filtrer les Pokémon qui ont échoué à l'optimisation
          .sort((a, b) => (a.id || 0) - (b.id || 0)); // Trier par ID Pokédex
      }

      // Optimiser les œufs
      if (Array.isArray(data?.eggs)) {
        optimizedData.eggs = data.eggs.filter(egg => egg !== null);
      }

      // Optimiser les photos
      if (Array.isArray(data?.photos)) {
        optimizedData.photos = data.photos
          .filter(photo => photo && photo.pokemon)
          .map(photo => {
            try {
              return {
                id: photo.id || Date.now(),
                date: photo.date || new Date().toISOString(),
                image: photo.image || '',
                pokemon: {
                  id: photo.pokemon?.id || 0,
                  name: photo.pokemon?.name || 'unknown',
                  sprites: {
                    front_default: this.compressSprites(photo.pokemon)?.sprites?.front_default || ''
                  },
                  isShiny: Boolean(photo.pokemon?.isShiny)
                }
              };
            } catch (error) {
              console.error('Erreur lors de l\'optimisation de la photo:', photo, error);
              return null;
            }
          })
          .filter(photo => photo !== null);
      }

      return optimizedData;
    }
  
    save(data) {
      try {
        if (!data) {
          console.error('Données invalides pour la sauvegarde');
          return false;
        }

        // Optimiser les données
        const serializedData = this.optimizeData(data);
        
        // Vérifier que les données ont été correctement optimisées
        if (data.pokemons?.length !== serializedData.pokemons?.length) {
          console.warn(`Attention: ${data.pokemons?.length} pokémons attendus, ${serializedData.pokemons?.length} sauvegardés`);
        }

        const dataString = JSON.stringify(serializedData);

        try {
          localStorage.setItem(this.storageKey, dataString);
          return true;
        } catch (storageError) {
          if (storageError.name === 'QuotaExceededError') {
            // Si erreur de quota, essayer de nettoyer d'abord
            console.warn('Tentative de nettoyage du localStorage...');
            this.clear();
            
            // Réessayer la sauvegarde
            localStorage.setItem(this.storageKey, dataString);
            return true;
          }
          throw storageError;
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        return false;
      }
    }
  
    load() {
      try {
        const savedData = localStorage.getItem(this.storageKey);
        if (!savedData) {
          return null;
        }

        const parsedData = JSON.parse(savedData);
        
        if (!parsedData || typeof parsedData !== 'object') {
          console.error('Données corrompues dans le localStorage');
          return null;
        }

        // Nettoyage et validation des données
        return {
          pokemons: Array.isArray(parsedData.pokemons) ? parsedData.pokemons : [],
          eggs: Array.isArray(parsedData.eggs) ? parsedData.eggs : [],
          photos: Array.isArray(parsedData.photos) ? parsedData.photos : [],
          userPokeballs: typeof parsedData.userPokeballs === 'number' ? parsedData.userPokeballs : 5
        };
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        this.clear();
        return null;
      }
    }
  
    clear() {
      try {
        localStorage.removeItem(this.storageKey);
        return true;
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        return false;
      }
    }
  }