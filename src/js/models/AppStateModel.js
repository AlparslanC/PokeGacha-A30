// models/AppStateModel.js - Modèle principal de l'état de l'application
class AppStateModel {
    constructor() {
      this.data = {
        pokemons: [],
        eggs: [],
        photos: [],
        userPokeballs: 10,
        cameraStream: null,
        selectedPokemonForPhoto: null,
      };
      this.observers = [];
    }
  
    // Pattern Observer pour notifier les changements
    addObserver(observer) {
      this.observers.push(observer);
    }
  
    removeObserver(observer) {
      this.observers = this.observers.filter(obs => obs !== observer);
    }
  
    notifyObservers(changeType, data) {
      console.log('Notification:', changeType, data);
      this.observers.forEach(observer => observer.update(changeType, data));
    }
  
    // Getters
    getPokemons() { return [...this.data.pokemons]; }
    getEggs() { return [...this.data.eggs]; }
    getPhotos() { return [...this.data.photos]; }
    getUserPokeballs() { return this.data.userPokeballs; }
    getCameraStream() { return this.data.cameraStream; }
    getSelectedPokemonForPhoto() { return this.data.selectedPokemonForPhoto; }
  
    // Setters avec notification
    addPokemon(pokemon) {
      if (!pokemon || !pokemon.types) {
        console.error('Pokémon invalide:', pokemon);
        return;
      }

      // Generate a unique ID for this instance
      const uniqueId = `${pokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Extraire et valider les types
      const types = pokemon.types.map(t => ({
        type: { name: t.type?.name || 'unknown' }
      }));
      const allTypes = types.map(t => t.type.name);
      const mainType = allTypes[0] || 'unknown';

      // Créer une structure propre et complète
      const processedPokemon = {
        id: pokemon.id || 0,  // Keep original ID for species reference
        uniqueId: uniqueId,   // Add unique instance ID
        name: pokemon.name || 'unknown',
        height: pokemon.height || 0,
        weight: pokemon.weight || 0,
        types: types,
        abilities: (pokemon.abilities || []).map(a => ({
          ability: { name: a.ability?.name || 'unknown' }
        })),
        sprites: {
          front_default: pokemon.sprites?.front_default || '',
          front_shiny: pokemon.isShiny ? (pokemon.sprites?.front_shiny || '') : null
        },
        species: {
          name: pokemon.species?.name || pokemon.name || 'unknown',
          url: pokemon.species?.url || ''
        },
        isShiny: pokemon.isShiny || false,
        allTypes: allTypes,
        mainType: mainType
      };
      
      this.data.pokemons.push(processedPokemon);
      console.log('État après ajout:', this.data.pokemons);
      this.notifyObservers('POKEMON_ADDED', processedPokemon);
    }
  
    removePokemon(pokemonId) {
      const index = this.data.pokemons.findIndex(p => p.uniqueId === pokemonId || p.id === pokemonId);
      if (index !== -1) {
        const removedPokemon = this.data.pokemons.splice(index, 1)[0];
        this.notifyObservers('POKEMON_REMOVED', removedPokemon);
        return removedPokemon;
      }
      return null;
    }
  
    addEgg(egg) {
      this.data.eggs.push(egg);
      this.notifyObservers('EGG_ADDED', egg);
    }
  
    removeEgg(index) {
      const egg = this.data.eggs.splice(index, 1)[0];
      this.notifyObservers('EGG_REMOVED', { egg, index });
    }
  
    updateEgg(index, egg) {
      this.data.eggs[index] = { ...this.data.eggs[index], ...egg };
      this.notifyObservers('EGG_UPDATED', { egg: this.data.eggs[index], index });
    }
  
    addPhoto(photo) {
      // Optimiser la taille des photos en ne gardant que les données essentielles
      const processedPhoto = {
        id: photo.id,
        date: photo.date,
        image: photo.image,
        pokemon: {
          id: photo.pokemon.id,
          name: photo.pokemon.name,
          sprites: {
            front_default: photo.pokemon.sprites.front_default
          },
          isShiny: photo.pokemon.isShiny || false
        }
      };
      this.data.photos.push(processedPhoto);
      this.notifyObservers('PHOTO_ADDED', processedPhoto);
    }
  
    setUserPokeballs(count) {
      this.data.userPokeballs = count;
      this.notifyObservers('POKEBALLS_UPDATED', count);
    }
  
    decrementPokeballs() {
      if (this.data.userPokeballs > 0) {
        this.data.userPokeballs--;
        this.notifyObservers('POKEBALLS_UPDATED', this.data.userPokeballs);
      }
    }
  
    incrementPokeballs() {
      this.data.userPokeballs++;
      this.notifyObservers('POKEBALLS_UPDATED', this.data.userPokeballs);
    }
  
    setCameraStream(stream) {
      this.data.cameraStream = stream;
      this.notifyObservers('CAMERA_STREAM_UPDATED', stream);
    }
  
    setSelectedPokemonForPhoto(pokemon) {
      this.data.selectedPokemonForPhoto = pokemon;
      this.notifyObservers('SELECTED_POKEMON_UPDATED', pokemon);
    }
  
    // Méthodes pour la persistance
    hydrate(data) {
      // Copie profonde des données
      if (data) {
        console.log('Données à hydrater:', data);
        
        // Process pokemons to ensure they all have uniqueIds
        const processedPokemons = data.pokemons ? JSON.parse(JSON.stringify(data.pokemons)).map(pokemon => {
          if (!pokemon.uniqueId) {
            // Generate a unique ID for existing Pokemon
            pokemon.uniqueId = `${pokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`Generated uniqueId for ${pokemon.name}:`, pokemon.uniqueId);
          }
          return pokemon;
        }) : [];

        this.data = {
          ...this.data,
          pokemons: processedPokemons,
          eggs: data.eggs ? JSON.parse(JSON.stringify(data.eggs)) : [],
          photos: data.photos ? JSON.parse(JSON.stringify(data.photos)) : [],
          userPokeballs: data.userPokeballs || 10,
          cameraStream: null, // Ne pas restaurer le stream de la caméra
          selectedPokemonForPhoto: null // Réinitialiser la sélection
        };
        console.log('État après hydratation:', this.data);
      }
      this.notifyObservers('STATE_HYDRATED', this.data);
    }
  
    serialize() {
      // Ensure all Pokemon have uniqueIds before serializing
      this.data.pokemons.forEach(pokemon => {
        if (!pokemon.uniqueId) {
          pokemon.uniqueId = `${pokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log(`Generated uniqueId for ${pokemon.name} during serialization:`, pokemon.uniqueId);
        }
      });

      // Copie profonde des données à sauvegarder
      const serializedData = {
        pokemons: JSON.parse(JSON.stringify(this.data.pokemons)),
        eggs: JSON.parse(JSON.stringify(this.data.eggs)),
        photos: JSON.parse(JSON.stringify(this.data.photos)),
        userPokeballs: this.data.userPokeballs
      };
      console.log('Données sérialisées:', serializedData);
      return serializedData;
    }
  
    // Méthode pour régénérer les uniqueIds pour tous les Pokemon
    regenerateUniqueIds() {
      console.log("Regenerating unique IDs for all Pokemon...");
      this.data.pokemons.forEach(pokemon => {
        const oldId = pokemon.uniqueId;
        pokemon.uniqueId = `${pokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Regenerated ID for ${pokemon.name}: ${oldId} -> ${pokemon.uniqueId}`);
      });
      this.notifyObservers('STATE_HYDRATED', this.data);
      return this.data.pokemons.length;
    }
  }