// models/AppStateModel.js - Modèle principal de l'état de l'application
class AppStateModel {
    constructor() {
      // Initialiser les cooldowns avant tout
      this.breedingCooldownTime = 1800000; // 30 minutes en millisecondes
      this.pokeballRechargeTime = 2700000; // 45 minutes en millisecondes (45 * 60 * 1000)
      this.maxPokeballs = 5;

      // Charger l'état du jeu
      const savedState = localStorage.getItem('gameState');
      console.log('État sauvegardé chargé:', savedState);
       
      try {
        // Charger l'état général du jeu
        const gameState = savedState ? JSON.parse(savedState) : {};
        console.log('État parsé:', gameState);
        
        this.data = {
          pokemons: gameState.pokemons || [],
          eggs: gameState.eggs || [],
          photos: gameState.photos || [],
          userPokeballs: gameState.userPokeballs !== undefined ? gameState.userPokeballs : 3,
          lastPokeballTime: gameState.lastPokeballTime || Date.now(),
          breedingCooldowns: {},
          cameraStream: null,
          selectedPokemonForPhoto: null,
        };

        // Charger les cooldowns depuis les Pokémon
        console.log('Pokémons chargés:', this.data.pokemons);
        this.data.pokemons.forEach(pokemon => {
          console.log('Vérification du Pokémon pour cooldown:', {
            id: pokemon.uniqueId,
            lastBreedingTime: pokemon.lastBreedingTime
          });
          
          if (pokemon.lastBreedingTime) {
            const now = Date.now();
            const endTime = pokemon.lastBreedingTime + this.breedingCooldownTime;
            const timeLeft = endTime - now;
            
            console.log('Calcul du cooldown:', {
              pokemonId: pokemon.uniqueId,
              lastBreedingTime: pokemon.lastBreedingTime,
              endTime: endTime,
              timeLeft: Math.round(timeLeft / 1000),
              'secondes restantes': true
            });

            if (timeLeft > 0) {
              this.data.breedingCooldowns[pokemon.uniqueId] = {
                lastBreedingTime: pokemon.lastBreedingTime,
                endTime: endTime
              };
              console.log('Cooldown restauré pour:', {
                pokemonId: pokemon.uniqueId,
                timeLeft: Math.round(timeLeft / 1000),
                'secondes': true
              });
            }
          }
        });
        
      } catch (error) {
        console.error('Erreur lors du chargement de l\'état:', error);
        this.data = {
          pokemons: [],
          eggs: [],
          photos: [],
          userPokeballs: 3,
          lastPokeballTime: Date.now(),
          breedingCooldowns: {},
          cameraStream: null,
          selectedPokemonForPhoto: null,
        };
      }
      
      this.observers = [];
      
      // Sauvegarder l'état initial
      this.serialize();
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
    getEggs() {
      console.log("Getting eggs from state:", this.data.eggs);
      return this.data.eggs || [];
    }
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
        mainType: mainType,
        isNew: true, // Marquer comme nouveau
        addedAt: Date.now() // Ajouter un timestamp pour le tri
      };
      
      this.data.pokemons.push(processedPokemon);
      
      // Trier d'abord par ID Pokédex, puis par shiny
      this.data.pokemons.sort((a, b) => {
        // D'abord par ID Pokédex
        const idCompare = (a.id || 0) - (b.id || 0);
        if (idCompare !== 0) return idCompare;
        
        // Ensuite par shiny (les shinys à la fin)
        if (!a.isShiny && b.isShiny) return -1;
        if (a.isShiny && !b.isShiny) return 1;
        
        // Enfin par date d'ajout (les plus récents en premier)
        return (b.addedAt || 0) - (a.addedAt || 0);
      });

      console.log('État après ajout:', this.data.pokemons);
      this.notifyObservers('POKEMON_ADDED', processedPokemon);
    }
  
    removePokemon(uniqueId) {
      const index = this.data.pokemons.findIndex(p => p.uniqueId === uniqueId);
      if (index !== -1) {
        const pokemon = this.data.pokemons.splice(index, 1)[0];
        this.notifyObservers('POKEMON_REMOVED', pokemon);
      }
    }
  
    addEgg(egg) {
      if (!this.data.eggs) {
        this.data.eggs = [];
      }

      // Vérifier que l'œuf a toutes les propriétés nécessaires
      if (!egg.createdAt || !egg.lastShake) {
        console.error("Tentative d'ajout d'un œuf invalide:", egg);
        return;
      }

      // Créer une copie de l'œuf avec toutes les propriétés nécessaires
      const processedEgg = {
        ...egg,
        createdAt: egg.createdAt,
        lastShake: egg.lastShake,
        progress: egg.progress || 0,
        isBreedingEgg: egg.isBreedingEgg || false,
        parentPokemon: egg.parentPokemon || null
      };

      this.data.eggs.push(processedEgg);
      console.log("Added egg to state:", {
        egg: processedEgg,
        totalEggs: this.data.eggs.length,
        allEggs: this.data.eggs
      });
      this.notifyObservers('EGG_ADDED', processedEgg);
    }
  
    removeEgg(index) {
      if (index < 0 || index >= this.data.eggs.length) {
        console.error("Tentative de suppression d'un œuf avec un index invalide:", index);
        return;
      }
      const egg = this.data.eggs.splice(index, 1)[0];
      console.log("Removed egg from state:", {
        removedEgg: egg,
        remainingEggs: this.data.eggs.length,
        allEggs: this.data.eggs
      });
      this.notifyObservers('EGG_REMOVED', { egg, index });
    }
  
    updateEgg(index, egg) {
      if (index < 0 || index >= this.data.eggs.length) {
        console.error("Tentative de mise à jour d'un œuf avec un index invalide:", index);
        return;
      }
      this.data.eggs[index] = { ...this.data.eggs[index], ...egg };
      console.log("Updated egg in state:", {
        updatedEgg: this.data.eggs[index],
        index,
        allEggs: this.data.eggs
      });
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
      if (this.data.userPokeballs < this.maxPokeballs) {
        this.data.userPokeballs++;
        this.data.lastPokeballTime = Date.now();
        this.notifyObservers('POKEBALLS_UPDATED', {
          count: this.data.userPokeballs,
          nextPokeballTime: this.getNextPokeballTime()
        });
      }
    }
  
    setCameraStream(stream) {
      this.data.cameraStream = stream;
      this.notifyObservers('CAMERA_STREAM_UPDATED', stream);
    }
  
    setSelectedPokemonForPhoto(pokemon) {
      this.data.selectedPokemonForPhoto = pokemon;
      this.notifyObservers('SELECTED_POKEMON_UPDATED', pokemon);
    }
  
    markPokemonAsSeen(pokemonId) {
      const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
      if (pokemon && pokemon.isNew) {
        pokemon.isNew = false;
        this.notifyObservers('POKEMON_UPDATED', pokemon);
      }
    }
  
    loadBreedingCooldowns() {
      try {
        const now = Date.now();
        const savedCooldowns = JSON.parse(localStorage.getItem('breedingCooldowns')) || {};
        
        // Nettoyer les cooldowns expirés
        this.data.breedingCooldowns = Object.entries(savedCooldowns).reduce((acc, [id, endTime]) => {
          if (endTime > now) {
            acc[id] = endTime;
          }
          return acc;
        }, {});
        
        // Sauvegarder les cooldowns nettoyés
        this.saveBreedingCooldowns();
        
        console.log('Cooldowns chargés:', this.data.breedingCooldowns);
      } catch (error) {
        console.error('Erreur lors du chargement des cooldowns:', error);
        this.data.breedingCooldowns = {};
        localStorage.removeItem('breedingCooldowns');
      }
    }
  
    saveBreedingCooldowns() {
      try {
        // S'assurer que tous les timestamps sont des nombres
        const cleanCooldowns = Object.entries(this.data.breedingCooldowns).reduce((acc, [id, time]) => {
          acc[id] = parseInt(time);
          return acc;
        }, {});
        
        const cooldowns = JSON.stringify(cleanCooldowns);
        localStorage.setItem('breedingCooldowns', cooldowns);
        console.log('Cooldowns sauvegardés:', cleanCooldowns);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des cooldowns:', error);
      }
    }
  
    startBreedingCooldown(pokemonId) {
      const now = Date.now();
      const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
      
      console.log('Démarrage du cooldown pour:', {
        pokemonId: pokemonId,
        found: !!pokemon,
        timestamp: now
      });
      
      if (pokemon) {
        pokemon.lastBreedingTime = now;
        this.data.breedingCooldowns[pokemonId] = {
          lastBreedingTime: now,
          endTime: now + this.breedingCooldownTime
        };
        
        const duration = Math.round(this.breedingCooldownTime / 1000);
        console.log('Cooldown démarré:', {
          pokemonId: pokemonId,
          lastBreedingTime: now,
          duration: duration,
          'secondes': true
        });
        
        // Sauvegarder immédiatement l'état
        this.serialize();
        
        this.notifyObservers('BREEDING_COOLDOWN_STARTED', {
          pokemonId: pokemonId,
          endTime: now + this.breedingCooldownTime,
          timeLeft: duration
        });
      } else {
        console.error('Pokemon non trouvé pour le cooldown:', pokemonId);
      }
    }
  
    isBreedingAvailable(pokemonId) {
      const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
      console.log('Vérification disponibilité pour:', {
        pokemonId: pokemonId,
        found: !!pokemon,
        lastBreedingTime: pokemon?.lastBreedingTime
      });
      
      if (!pokemon || !pokemon.lastBreedingTime) return true;
      
      const now = Date.now();
      const endTime = pokemon.lastBreedingTime + this.breedingCooldownTime;
      const timeLeft = Math.round((endTime - now) / 1000);
      
      console.log('Calcul disponibilité:', {
        pokemonId: pokemonId,
        now: now,
        endTime: endTime,
        timeLeft: timeLeft,
        'secondes': true
      });
      
      if (now >= endTime) {
        delete pokemon.lastBreedingTime;
        delete this.data.breedingCooldowns[pokemonId];
        this.serialize();
        console.log('Cooldown terminé pour:', pokemonId);
        return true;
      }
      
      console.log('Cooldown actif:', {
        pokemonId: pokemonId,
        timeLeft: timeLeft,
        'secondes': true
      });
      return false;
    }
  
    getBreedingCooldownProgress(pokemonId) {
      const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
      if (!pokemon || !pokemon.lastBreedingTime) return 100;

      const now = Date.now();
      const endTime = pokemon.lastBreedingTime + this.breedingCooldownTime;
      
      if (now >= endTime) {
        delete pokemon.lastBreedingTime;
        delete this.data.breedingCooldowns[pokemonId];
        this.serialize();
        return 100;
      }

      const elapsed = now - pokemon.lastBreedingTime;
      const progress = (elapsed / this.breedingCooldownTime) * 100;
      const result = Math.min(100, Math.max(0, progress));
      const timeLeft = Math.round((endTime - now) / 1000);
      
      console.log('Progression du cooldown:', {
        pokemonId: pokemonId,
        elapsed: Math.round(elapsed / 1000),
        progress: Math.round(result),
        timeLeft: timeLeft,
        'secondes': true
      });
      
      return result;
    }
  
    // Méthodes pour la persistance
    hydrate(data) {
      if (data) {
        console.log('Hydratation avec données:', data);
        
        const processedEggs = (data.eggs || []).map(egg => ({
          ...egg,
          createdAt: Number(egg.createdAt) || Date.now(),
          lastShake: Number(egg.lastShake) || Date.now(),
          progress: Number(egg.progress) || 0
        }));

        // Traiter les Pokémon pour s'assurer que lastBreedingTime est un nombre
        const processedPokemons = (data.pokemons || []).map(pokemon => {
          const processed = {
            ...pokemon,
            lastBreedingTime: pokemon.lastBreedingTime ? Number(pokemon.lastBreedingTime) : null
          };
          console.log('Pokémon traité:', {
            id: processed.uniqueId,
            lastBreedingTime: processed.lastBreedingTime
          });
          return processed;
        });

        this.data = {
          ...this.data,
          pokemons: processedPokemons,
          eggs: processedEggs,
          photos: data.photos || [],
          userPokeballs: data.userPokeballs || 10,
          breedingCooldowns: {}
        };

        // Reconstruire les cooldowns à partir des timestamps des Pokémon
        this.data.pokemons.forEach(pokemon => {
          if (pokemon.lastBreedingTime) {
            const now = Date.now();
            const endTime = pokemon.lastBreedingTime + this.breedingCooldownTime;
            if (now < endTime) {
              this.data.breedingCooldowns[pokemon.uniqueId] = {
                lastBreedingTime: pokemon.lastBreedingTime,
                endTime: endTime
              };
              console.log('Cooldown restauré:', {
                pokemonId: pokemon.uniqueId,
                timeLeft: Math.round((endTime - now) / 1000),
                'secondes': true
              });
            }
          }
        });
        
        console.log('État hydraté:', {
          pokemonCount: this.data.pokemons.length,
          withCooldowns: Object.keys(this.data.breedingCooldowns).length
        });
        
        this.notifyObservers('STATE_HYDRATED', {
          data: this.data,
          cooldowns: this.data.breedingCooldowns
        });
      }
    }
  
    serialize() {
      // Sauvegarder l'état complet du jeu
      const gameState = {
        pokemons: this.data.pokemons.map(pokemon => ({
          ...pokemon,
          lastBreedingTime: pokemon.lastBreedingTime || null
        })),
        eggs: this.data.eggs,
        photos: this.data.photos,
        userPokeballs: this.data.userPokeballs,
        lastPokeballTime: this.data.lastPokeballTime,
        breedingCooldowns: this.data.breedingCooldowns
      };
      
      localStorage.setItem('gameState', JSON.stringify(gameState));
      console.log('État du jeu sauvegardé:', gameState);
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

    cleanExpiredCooldowns() {
      const now = Date.now();
      let hasChanges = false;
      
      Object.entries(this.data.breedingCooldowns).forEach(([pokemonId, endTime]) => {
        if (endTime <= now) {
          delete this.data.breedingCooldowns[pokemonId];
          hasChanges = true;
          console.log(`Cooldown expiré supprimé pour ${pokemonId}`);
        } else {
          const timeLeft = Math.round((endTime - now) / 1000);
          console.log(`Cooldown actif pour ${pokemonId}: ${timeLeft} secondes restantes`);
        }
      });
      
      if (hasChanges) {
        this.serialize();
      }
    }

    getNextPokeballTime() {
      if (this.data.userPokeballs >= this.maxPokeballs) {
        return null;
      }
      return this.data.lastPokeballTime + this.pokeballRechargeTime;
    }
  }