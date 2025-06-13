// models/AppStateModel.js - Modèle principal de l'état de l'application
class AppStateModel {
    constructor() {
      // Initialiser les cooldowns avant tout
      this.breedingCooldownTime = 300000; // 5 minutes en millisecondes (5 * 60 * 1000)
      this.pokeballRechargeTime = 10; // 1 minute en millisecondes (1 * 60 * 1000)
      this.maxPokeballs = 10;

      // Charger l'état du jeu
      const savedState = localStorage.getItem('gameState');
      const isFirstVisit = !localStorage.getItem('hasVisited');
      console.log('État sauvegardé chargé:', savedState);
       
      try {
        // Charger l'état général du jeu
        const gameState = savedState ? JSON.parse(savedState) : {};
        console.log('État parsé:', gameState);
        
        this.data = {
          pokemons: gameState.pokemons || [],
          eggs: gameState.eggs || [],
          photos: gameState.photos || [],
          userPokeballs: gameState.userPokeballs !== undefined ? gameState.userPokeballs : (isFirstVisit ? 5 : 0),
          lastPokeballTime: gameState.lastPokeballTime || Date.now(),
          breedingCooldowns: gameState.breedingCooldowns || {},
          candyCount: gameState.candyCount || 0,
          cameraStream: null,
          selectedPokemonForPhoto: null,
        };

        // Marquer comme visité après l'initialisation
        if (isFirstVisit) {
          localStorage.setItem('hasVisited', 'true');
        }

        // Nettoyer les cooldowns expirés
        const now = Date.now();
        Object.entries(this.data.breedingCooldowns).forEach(([pokemonId, cooldown]) => {
          if (cooldown.endTime <= now) {
            delete this.data.breedingCooldowns[pokemonId];
            // Supprimer aussi le lastBreedingTime du Pokémon
            const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
            if (pokemon) {
              delete pokemon.lastBreedingTime;
            }
          }
        });

        // Charger également les cooldowns du localStorage dédié 
        // (les valeurs de ce dernier prendront priorité)
        this.loadBreedingCooldowns();

        // Sauvegarder l'état initial nettoyé
        this.serialize();
        
      } catch (error) {
        console.error('Erreur lors du chargement de l\'état:', error);
        this.data = {
          pokemons: [],
          eggs: [],
          photos: [],
          userPokeballs: isFirstVisit ? 5 : 0,
          lastPokeballTime: Date.now(),
          breedingCooldowns: {},
          candyCount: 0,
          cameraStream: null,
          selectedPokemonForPhoto: null,
        };

        // Marquer comme visité même en cas d'erreur
        if (isFirstVisit) {
          localStorage.setItem('hasVisited', 'true');
        }
        
        // Même en cas d'erreur, essayer de charger les cooldowns
        this.loadBreedingCooldowns();
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
    getCandyCount() {
      return this.data.candyCount;
    }
  
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
        // Sauvegarder l'état après l'incrémentation
        this.serialize();
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
        console.log('Cooldowns chargés depuis localStorage:', savedCooldowns);
        
        // Convertir les timestamps en objets de cooldown complets
        const convertedCooldowns = {};
        
        // 1. D'abord, traiter les cooldowns stockés dans le localStorage dédié
        Object.entries(savedCooldowns).forEach(([id, endTime]) => {
          // Vérifier si l'ID du Pokémon existe toujours dans la collection
          const pokemon = this.data.pokemons.find(p => p.uniqueId === id);
          
          if (pokemon && endTime > now) {
            const lastBreedingTime = endTime - this.breedingCooldownTime;
            convertedCooldowns[id] = {
              lastBreedingTime: lastBreedingTime,
              endTime: endTime
            };
            
            // Mettre à jour aussi lastBreedingTime sur le Pokémon
            pokemon.lastBreedingTime = lastBreedingTime;
            
            console.log('Cooldown chargé depuis localStorage:', {
              pokemonId: id,
              pokemonName: pokemon.name,
              timeLeft: Math.round((endTime - now) / 1000),
              'secondes': true
            });
          } else if (endTime <= now) {
            // Si le cooldown est expiré, le supprimer du localStorage
            console.log(`Cooldown expiré supprimé pour ${id}`);
            delete savedCooldowns[id];
            
            // Si le Pokémon existe, supprimer aussi son lastBreedingTime
            if (pokemon) {
              delete pokemon.lastBreedingTime;
            }
          } else {
            console.log(`Pokémon non trouvé pour le cooldown ${id}, cooldown ignoré`);
          }
        });
        
        // 2. Ensuite, vérifier si des Pokémon ont des lastBreedingTime mais pas de cooldown
        this.data.pokemons.forEach(pokemon => {
          if (pokemon.lastBreedingTime && !convertedCooldowns[pokemon.uniqueId]) {
            const endTime = pokemon.lastBreedingTime + this.breedingCooldownTime;
            
            // Vérifier si le cooldown n'est pas expiré
            if (endTime > now) {
              convertedCooldowns[pokemon.uniqueId] = {
                lastBreedingTime: pokemon.lastBreedingTime,
                endTime: endTime
              };
              
              console.log('Cooldown restauré depuis Pokémon:', {
                pokemonId: pokemon.uniqueId,
                pokemonName: pokemon.name,
                timeLeft: Math.round((endTime - now) / 1000),
                'secondes': true
              });
            } else {
              // Si le cooldown est expiré, supprimer lastBreedingTime du Pokémon
              delete pokemon.lastBreedingTime;
              console.log(`Cooldown expiré supprimé pour ${pokemon.name} (${pokemon.uniqueId})`);
            }
          }
        });
        
        // Mettre à jour les cooldowns dans l'état principal
        this.data.breedingCooldowns = convertedCooldowns;
        
        // Sauvegarder les modifications dans le localStorage si des cooldowns ont été supprimés
        if (Object.keys(savedCooldowns).length > 0) {
          localStorage.setItem('breedingCooldowns', JSON.stringify(savedCooldowns));
        }
        
        // Afficher les cooldowns actifs après chargement
        if (Object.keys(convertedCooldowns).length > 0) {
          console.log('Cooldowns actifs après chargement:');
          Object.entries(convertedCooldowns).forEach(([id, cooldown]) => {
            const pokemon = this.data.pokemons.find(p => p.uniqueId === id);
            if (pokemon) {
              console.log(`- ${pokemon.name} (${id}): ${Math.round((cooldown.endTime - now) / 1000)}s restantes`);
            }
          });
        } else {
          console.log('Aucun cooldown actif après chargement');
        }
        
        // Notifier les observateurs que les cooldowns ont été mis à jour
        this.notifyObservers('BREEDING_COOLDOWNS_UPDATED', this.data.breedingCooldowns);
      } catch (error) {
        console.error('Erreur lors du chargement des cooldowns:', error);
      }
    }
  
    saveBreedingCooldowns() {
      try {
        // Ne sauvegarder que si des cooldowns existent
        if (!this.data.breedingCooldowns || Object.keys(this.data.breedingCooldowns).length === 0) {
          console.log('Aucun cooldown à sauvegarder');
          return;
        }

        // Extraire les endTime des cooldowns pour le localStorage dédié
        const cleanCooldowns = Object.entries(this.data.breedingCooldowns).reduce((acc, [id, cooldown]) => {
          // Vérifier si le Pokémon existe toujours
          const pokemon = this.data.pokemons.find(p => p.uniqueId === id);
          if (pokemon && cooldown && cooldown.endTime) {
            // Ne sauvegarder que les cooldowns valides
            acc[id] = cooldown.endTime;
            
            // S'assurer que le Pokémon a aussi lastBreedingTime
            if (!pokemon.lastBreedingTime) {
              pokemon.lastBreedingTime = cooldown.lastBreedingTime;
            }
            
            console.log(`Sauvegarde du cooldown pour ${pokemon.name} (${id}): ${Math.round((cooldown.endTime - Date.now()) / 1000)}s restantes`);
          }
          return acc;
        }, {});
        
        // Ne sauvegarder que si nous avons des cooldowns valides
        if (Object.keys(cleanCooldowns).length > 0) {
          const cooldownsJson = JSON.stringify(cleanCooldowns);
          localStorage.setItem('breedingCooldowns', cooldownsJson);
          console.log('Cooldowns sauvegardés dans localStorage:', cleanCooldowns);
          
          // Sauvegarder aussi dans l'état principal
          localStorage.setItem('gameState', JSON.stringify(this.data));
        } else {
          console.log('Aucun cooldown valide à sauvegarder');
        }
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des cooldowns:', error);
        // Ne pas effacer les cooldowns en cas d'erreur
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
        
        // Sauvegarder également dans le localStorage dédié aux cooldowns
        this.saveBreedingCooldowns();
        
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
      const cooldown = this.data.breedingCooldowns[pokemonId];
      console.log('Vérification disponibilité pour:', {
        pokemonId: pokemonId,
        cooldown: cooldown
      });
      
      if (!cooldown) return true;
      
      const now = Date.now();
      const timeLeft = Math.round((cooldown.endTime - now) / 1000);
      
      console.log('Calcul disponibilité:', {
        pokemonId: pokemonId,
        now: now,
        endTime: cooldown.endTime,
        timeLeft: timeLeft,
        'secondes': true
      });
      
      if (now >= cooldown.endTime) {
        delete this.data.breedingCooldowns[pokemonId];
        const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
        if (pokemon) {
          delete pokemon.lastBreedingTime;
        }
        this.serialize();
        this.saveBreedingCooldowns();
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
      const cooldown = this.data.breedingCooldowns[pokemonId];
      if (!cooldown) return { progress: 100, timeLeft: 0 };

      const now = Date.now();
      
      if (now >= cooldown.endTime) {
        delete this.data.breedingCooldowns[pokemonId];
        const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
        if (pokemon) {
          delete pokemon.lastBreedingTime;
        }
        this.serialize();
        this.saveBreedingCooldowns();
        return { progress: 100, timeLeft: 0 };
      }

      const elapsed = now - cooldown.lastBreedingTime;
      const progress = (elapsed / this.breedingCooldownTime) * 100;
      const result = Math.min(100, Math.max(0, progress));
      const timeLeft = Math.round((cooldown.endTime - now) / 1000);
      
      console.log('Progression du cooldown:', {
        pokemonId: pokemonId,
        elapsed: Math.round(elapsed / 1000),
        progress: Math.round(result),
        timeLeft: timeLeft,
        'secondes': true
      });
      
      return { 
        progress: result,
        timeLeft: timeLeft
      };
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
            name: processed.name,
            lastBreedingTime: processed.lastBreedingTime
          });
          return processed;
        });

        // Sauvegarder les cooldowns existants avant de les remplacer
        const existingCooldowns = { ...this.data.breedingCooldowns };
        console.log('Cooldowns existants avant hydratation:', existingCooldowns);

        this.data = {
          ...this.data,
          pokemons: processedPokemons,
          eggs: processedEggs,
          photos: data.photos || [],
          userPokeballs: data.userPokeballs || 0,
          lastPokeballTime: data.lastPokeballTime || Date.now(),
          candyCount: data.candyCount || 0,
          // Récupérer les cooldowns depuis les données chargées
          breedingCooldowns: data.breedingCooldowns || {}
        };

        // Si les cooldowns existants sont vides, reconstruire les cooldowns à partir des timestamps des Pokémon
        if (Object.keys(this.data.breedingCooldowns).length === 0) {
          console.log('Reconstruire les cooldowns à partir des lastBreedingTime des Pokémon');
          this.data.pokemons.forEach(pokemon => {
            if (pokemon.lastBreedingTime) {
              const now = Date.now();
              const endTime = pokemon.lastBreedingTime + this.breedingCooldownTime;
              if (now < endTime) {
                this.data.breedingCooldowns[pokemon.uniqueId] = {
                  lastBreedingTime: pokemon.lastBreedingTime,
                  endTime: endTime
                };
                console.log('Cooldown restauré depuis Pokémon:', {
                  pokemonId: pokemon.uniqueId,
                  pokemonName: pokemon.name,
                  timeLeft: Math.round((endTime - now) / 1000),
                  'secondes': true
                });
              }
            }
          });
        }
        
        console.log('État hydraté:', {
          pokemonCount: this.data.pokemons.length,
          withCooldowns: Object.keys(this.data.breedingCooldowns).length
        });
        
        // Recharger aussi les cooldowns depuis le localStorage dédié (cela prendra priorité)
        this.loadBreedingCooldowns();
        
        this.notifyObservers('STATE_HYDRATED', {
          data: this.data,
          cooldowns: this.data.breedingCooldowns
        });
      }
    }
  
    serialize() {
      const serializedData = {
        pokemons: this.data.pokemons,
        eggs: this.data.eggs,
        photos: this.data.photos,
        userPokeballs: this.data.userPokeballs,
        lastPokeballTime: this.data.lastPokeballTime,
        breedingCooldowns: this.data.breedingCooldowns,
        candyCount: this.data.candyCount
      };
      
      localStorage.setItem('gameState', JSON.stringify(serializedData));
      
      // S'assurer que les cooldowns sont également sauvegardés dans le localStorage dédié
      this.saveBreedingCooldowns();
      
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

    cleanExpiredCooldowns() {
      const now = Date.now();
      let hasChanges = false;
      
      // Vérifier si breedingCooldowns existe
      if (!this.data.breedingCooldowns) {
        this.data.breedingCooldowns = {};
        return false;
      }
      
      Object.entries(this.data.breedingCooldowns).forEach(([pokemonId, cooldown]) => {
        // Vérifier si le cooldown est valide
        if (!cooldown || !cooldown.endTime) {
          delete this.data.breedingCooldowns[pokemonId];
          hasChanges = true;
          console.log(`Cooldown invalide supprimé pour ${pokemonId}`);
          return;
        }
        
        if (cooldown.endTime <= now) {
          // Supprimer le cooldown
          delete this.data.breedingCooldowns[pokemonId];
          
          // Supprimer également lastBreedingTime du Pokémon
          const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
          if (pokemon) {
            delete pokemon.lastBreedingTime;
            console.log(`Cooldown expiré supprimé pour ${pokemon.name} (${pokemonId})`);
          } else {
            console.log(`Pokémon non trouvé pour le cooldown expiré ${pokemonId}`);
          }
          
          hasChanges = true;
        } else {
          const timeLeft = Math.round((cooldown.endTime - now) / 1000);
          console.log(`Cooldown actif pour ${pokemonId}: ${timeLeft} secondes restantes`);
        }
      });
      
      if (hasChanges) {
        // Sauvegarder l'état du jeu
        this.serialize();
        
        // Sauvegarder également dans le localStorage dédié aux cooldowns
        this.saveBreedingCooldowns();
        
        // Notifier les observateurs que les cooldowns ont changé
        this.notifyObservers('BREEDING_COOLDOWNS_UPDATED', this.data.breedingCooldowns);
      }
      
      return hasChanges;
    }

    getNextPokeballTime() {
      if (this.data.userPokeballs >= this.maxPokeballs) {
        return null;
      }
      return this.data.lastPokeballTime + this.pokeballRechargeTime;
    }

    checkAndAddPokeball() {
      const nextPokeballTime = this.getNextPokeballTime();
      if (nextPokeballTime && Date.now() >= nextPokeballTime) {
        this.incrementPokeballs();
        return true;
      }
      return false;
    }

    incrementCandyCount(amount) {
      this.data.candyCount += amount;
      this.notifyObservers("CANDY_UPDATED");
    }

    decrementCandyCount(amount) {
      if (this.data.candyCount >= amount) {
        this.data.candyCount -= amount;
        this.notifyObservers("CANDY_UPDATED");
        return true;
      }
      return false;
    }

    getPokemonById(uniqueId) {
      return this.data.pokemons.find(p => p.uniqueId === uniqueId);
    }
  }