// models/AppStateModel.js - Modèle principal de l'état de l'application
class AppStateModel {
    constructor() {
      // Initialiser les cooldowns avant tout
      this.breedingCooldownTime = 300000; // 5 minutes en millisecondes (5 * 60 * 1000)
      this.pokeballRechargeTime = 300000; // 5 minutes en millisecondes (5 * 60 * 1000)
      this.maxPokeballs = 10;

      // Charger l'état du jeu
      const savedState = localStorage.getItem('gameState');
      const isFirstVisit = !localStorage.getItem('hasVisited');
      console.log('État sauvegardé chargé:', savedState);
       
      try {
        // Charger l'état général du jeu
        const gameState = savedState ? JSON.parse(savedState) : {};
        console.log('État parsé:', gameState);
        
        // S'assurer que lastPokeballTime soit un timestamp valide
        const storedLastPokeballTime = gameState.lastPokeballTime ? Number(gameState.lastPokeballTime) : null;
        const validLastPokeballTime = storedLastPokeballTime && !isNaN(storedLastPokeballTime) 
          ? storedLastPokeballTime 
          : Date.now();
          
        // Charger les cooldowns de breeding depuis le localStorage dédié
        let breedingCooldowns = {};
        try {
          const breedingCooldownsStr = localStorage.getItem('breedingCooldowns');
          if (breedingCooldownsStr) {
            const parsedCooldowns = JSON.parse(breedingCooldownsStr);
            if (parsedCooldowns && typeof parsedCooldowns === 'object') {
              breedingCooldowns = parsedCooldowns;
              console.log('Cooldowns de breeding chargés au démarrage:', breedingCooldowns);
            }
          }
        } catch (e) {
          console.error('Erreur lors du chargement des cooldowns de breeding au démarrage:', e);
        }
        
        // Traitement des Pokémon pour s'assurer que lastBreedingTime est correctement défini
        const processedPokemons = Array.isArray(gameState.pokemons) ? gameState.pokemons.map(pokemon => {
          // Pour chaque Pokémon, vérifier si un cooldown existe
          const pokemonId = pokemon.uniqueId;
          if (pokemonId && breedingCooldowns[pokemonId]) {
            // Si oui, calculer et définir lastBreedingTime
            const endTime = Number(breedingCooldowns[pokemonId]);
            if (!isNaN(endTime) && endTime > Date.now()) {
              pokemon.lastBreedingTime = endTime - this.breedingCooldownTime;
              console.log(`lastBreedingTime défini pour ${pokemon.name} au chargement: ${new Date(pokemon.lastBreedingTime).toISOString()}`);
            } else {
              // Si le cooldown est expiré, supprimer la référence
              delete breedingCooldowns[pokemonId];
              delete pokemon.lastBreedingTime;
            }
          }
          return pokemon;
        }) : [];
        
        // Construction des objets cooldown dans le format attendu
        const processedBreedingCooldowns = {};
        Object.entries(breedingCooldowns).forEach(([id, endTime]) => {
          if (!isNaN(Number(endTime)) && Number(endTime) > Date.now()) {
            const lastBreedingTime = Number(endTime) - this.breedingCooldownTime;
            processedBreedingCooldowns[id] = {
              lastBreedingTime: lastBreedingTime,
              endTime: Number(endTime)
            };
          }
        });
        
        this.data = {
          pokemons: processedPokemons,
          eggs: gameState.eggs || [],
          photos: gameState.photos || [],
          userPokeballs: gameState.userPokeballs !== undefined ? gameState.userPokeballs : (isFirstVisit ? 5 : 0),
          lastPokeballTime: validLastPokeballTime,
          breedingCooldowns: processedBreedingCooldowns,
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

        // Vérification des cooldowns chargés
        console.log(`${Object.keys(this.data.breedingCooldowns).length} cooldowns chargés au démarrage`);
        this.data.pokemons.forEach(pokemon => {
          if (pokemon.lastBreedingTime) {
            console.log(`Pokémon ${pokemon.name} a un lastBreedingTime: ${new Date(pokemon.lastBreedingTime).toISOString()}`);
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
        // Ne pas mettre à jour lastPokeballTime quand on utilise une Pokeball
        // car cela réinitialise le cooldown
        this.notifyObservers('POKEBALLS_UPDATED', this.data.userPokeballs);
        // Save immediately to ensure the state persists
        this.serialize();
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
        let savedCooldowns = {};
        
        try {
          // Essayer de charger les cooldowns du localStorage dédié
          const cooldownsString = localStorage.getItem('breedingCooldowns');
          if (cooldownsString) {
            savedCooldowns = JSON.parse(cooldownsString) || {};
            console.log('Cooldowns chargés depuis localStorage:', savedCooldowns);
          }
        } catch (parseError) {
          console.error('Erreur lors du parsing des cooldowns:', parseError);
          savedCooldowns = {};
        }
        
        // Convertir les timestamps en objets de cooldown complets
        const convertedCooldowns = {};
        let hasUpdatedPokemons = false;
        
        // 1. D'abord, traiter les cooldowns stockés dans le localStorage dédié
        Object.entries(savedCooldowns).forEach(([id, endTime]) => {
          // S'assurer que endTime est un nombre
          const numEndTime = Number(endTime);
          if (isNaN(numEndTime)) {
            console.warn(`Cooldown invalide pour ${id}, timestamp non numérique:`, endTime);
            return;
          }
          
          // Vérifier si l'ID du Pokémon existe toujours dans la collection
          const pokemon = this.data.pokemons.find(p => p.uniqueId === id);
          
          if (pokemon && numEndTime > now) {
            const lastBreedingTime = numEndTime - this.breedingCooldownTime;
            convertedCooldowns[id] = {
              lastBreedingTime: lastBreedingTime,
              endTime: numEndTime
            };
            
            // Important: Mettre à jour lastBreedingTime sur le Pokémon lui-même
            // Cela garantit que l'information est sauvegardée avec le Pokémon
            if (pokemon.lastBreedingTime !== lastBreedingTime) {
              pokemon.lastBreedingTime = lastBreedingTime;
              hasUpdatedPokemons = true;
              console.log(`lastBreedingTime mis à jour pour ${pokemon.name} (${id}): ${new Date(lastBreedingTime).toISOString()}`);
            }
            
            console.log('Cooldown chargé depuis localStorage:', {
              pokemonId: id,
              pokemonName: pokemon.name,
              timeLeft: Math.round((numEndTime - now) / 1000),
              'secondes': true
            });
          } else if (numEndTime <= now) {
            // Si le cooldown est expiré, le supprimer du localStorage
            console.log(`Cooldown expiré supprimé pour ${id}`);
            delete savedCooldowns[id];
            
            // Si le Pokémon existe, supprimer aussi son lastBreedingTime
            if (pokemon) {
              delete pokemon.lastBreedingTime;
              hasUpdatedPokemons = true;
            }
          } else if (!pokemon) {
            // Si le Pokémon n'existe pas, supprimer le cooldown
            console.log(`Pokémon non trouvé pour le cooldown ${id}, cooldown supprimé`);
            delete savedCooldowns[id];
          }
        });
        
        // 2. Ensuite, vérifier si des Pokémon ont des lastBreedingTime mais pas de cooldown
        this.data.pokemons.forEach(pokemon => {
          if (pokemon.lastBreedingTime && !convertedCooldowns[pokemon.uniqueId]) {
            // S'assurer que lastBreedingTime est un nombre
            const lastBreedingTime = Number(pokemon.lastBreedingTime);
            if (isNaN(lastBreedingTime)) {
              console.warn(`lastBreedingTime invalide pour ${pokemon.name}:`, pokemon.lastBreedingTime);
              delete pokemon.lastBreedingTime;
              hasUpdatedPokemons = true;
              return;
            }
            
            const endTime = lastBreedingTime + this.breedingCooldownTime;
            
            // Vérifier si le cooldown n'est pas expiré
            if (endTime > now) {
              convertedCooldowns[pokemon.uniqueId] = {
                lastBreedingTime: lastBreedingTime,
                endTime: endTime
              };
              
              // Aussi ajouter au savedCooldowns pour le sauvegarder dans localStorage
              savedCooldowns[pokemon.uniqueId] = endTime;
              
              console.log('Cooldown restauré depuis Pokémon:', {
                pokemonId: pokemon.uniqueId,
                pokemonName: pokemon.name,
                timeLeft: Math.round((endTime - now) / 1000),
                'secondes': true
              });
            } else {
              // Si le cooldown est expiré, supprimer lastBreedingTime du Pokémon
              delete pokemon.lastBreedingTime;
              hasUpdatedPokemons = true;
              console.log(`Cooldown expiré supprimé pour ${pokemon.name} (${pokemon.uniqueId})`);
            }
          }
        });
        
        // Mettre à jour les cooldowns dans l'état principal
        this.data.breedingCooldowns = convertedCooldowns;
        
        // Sauvegarder les modifications dans le localStorage
        if (Object.keys(savedCooldowns).length > 0) {
          localStorage.setItem('breedingCooldowns', JSON.stringify(savedCooldowns));
        } else {
          // S'il n'y a plus de cooldowns, supprimer l'entrée du localStorage
          localStorage.removeItem('breedingCooldowns');
        }
        
        // Si on a mis à jour des Pokémon, il faut sauvegarder l'état complet
        if (hasUpdatedPokemons) {
          console.log('Des lastBreedingTime ont été mis à jour, sauvegarde de l\'état');
          // Sauvegarder l'état principal pour persister les changements sur les Pokémon
          localStorage.setItem('gameState', JSON.stringify(this.data));
        }
        
        // Afficher les cooldowns actifs après chargement
        if (Object.keys(convertedCooldowns).length > 0) {
          console.log('Cooldowns actifs après chargement:');
          Object.entries(convertedCooldowns).forEach(([id, cooldown]) => {
            const pokemon = this.data.pokemons.find(p => p.uniqueId === id);
            if (pokemon) {
              console.log(`- ${pokemon.name} (${id}): ${Math.round((cooldown.endTime - now) / 1000)}s restantes`);
              // Vérifier que lastBreedingTime est bien défini sur le Pokémon
              console.log(`  lastBreedingTime sur l'objet Pokemon: ${pokemon.lastBreedingTime ? new Date(pokemon.lastBreedingTime).toISOString() : 'non défini'}`);
            }
          });
        } else {
          console.log('Aucun cooldown actif après chargement');
        }
        
        // Notifier les observateurs que les cooldowns ont été mis à jour
        this.notifyObservers('BREEDING_COOLDOWNS_UPDATED', this.data.breedingCooldowns);
        
        return true;
      } catch (error) {
        console.error('Erreur lors du chargement des cooldowns:', error);
        return false;
      }
    }
  
    saveBreedingCooldowns() {
      try {
        // Ne sauvegarder que si des cooldowns existent
        if (!this.data.breedingCooldowns) {
          this.data.breedingCooldowns = {};
        }

        // Nettoyer les cooldowns expirés avant de les sauvegarder
        const now = Date.now();
        const cleanCooldowns = Object.entries(this.data.breedingCooldowns).reduce((acc, [id, cooldown]) => {
          // Vérifier si le Pokémon existe toujours et si le cooldown n'a pas expiré
          const pokemon = this.data.pokemons.find(p => p.uniqueId === id);
          if (pokemon && cooldown && cooldown.endTime && cooldown.endTime > now) {
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
        
        // Sauvegarder même si nous n'avons pas de cooldowns valides
        const cooldownsJson = JSON.stringify(cleanCooldowns);
        localStorage.setItem('breedingCooldowns', cooldownsJson);
        console.log('Cooldowns sauvegardés dans localStorage:', cleanCooldowns);
        
        // S'assurer que l'objet breedingCooldowns dans this.data est à jour
        // pour qu'il soit sauvegardé correctement dans gameState
        Object.keys(this.data.breedingCooldowns).forEach(id => {
          if (!cleanCooldowns[id]) {
            delete this.data.breedingCooldowns[id];
            // Aussi supprimer lastBreedingTime du Pokémon
            const pokemon = this.data.pokemons.find(p => p.uniqueId === id);
            if (pokemon) {
              delete pokemon.lastBreedingTime;
            }
          }
        });
        
        // Sauvegarder aussi dans l'état principal
        localStorage.setItem('gameState', JSON.stringify(this.data));
        
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
        // S'assurer que les données sont cohérentes
        if (!this.data.breedingCooldowns) {
          this.data.breedingCooldowns = {};
        }
        
        const endTime = now + this.breedingCooldownTime;
        
        // Mettre à jour à la fois le pokémon et le cooldown
        // Crucial: Définir explicitement lastBreedingTime sur l'objet Pokémon
        pokemon.lastBreedingTime = now;
        console.log(`lastBreedingTime défini sur le Pokemon ${pokemon.name}: ${now}`);
        
        this.data.breedingCooldowns[pokemonId] = {
          lastBreedingTime: now,
          endTime: endTime
        };
        
        const duration = Math.round(this.breedingCooldownTime / 1000);
        console.log('Cooldown démarré:', {
          pokemonId: pokemonId,
          pokemonName: pokemon.name,
          lastBreedingTime: now,
          endTime: endTime,
          duration: duration,
          'secondes': true
        });
        
        // Sauvegarde DIRECTE dans localStorage des breedingCooldowns
        try {
          const savedCooldowns = JSON.parse(localStorage.getItem('breedingCooldowns') || '{}');
          savedCooldowns[pokemonId] = endTime;
          localStorage.setItem('breedingCooldowns', JSON.stringify(savedCooldowns));
          console.log(`Cooldown sauvegardé dans localStorage.breedingCooldowns pour ${pokemon.name}: ${Math.round((endTime - now) / 1000)}s`);
        } catch (error) {
          console.error('Erreur lors de la sauvegarde directe du breedingCooldown:', error);
        }
        
        // Sauvegarde DIRECTE du pokemon avec son lastBreedingTime dans le gameState
        try {
          const gameState = JSON.parse(localStorage.getItem('gameState') || '{}');
          if (gameState.pokemons && Array.isArray(gameState.pokemons)) {
            const pokemonIndex = gameState.pokemons.findIndex(p => p.uniqueId === pokemonId);
            if (pokemonIndex >= 0) {
              gameState.pokemons[pokemonIndex].lastBreedingTime = now;
              // Aussi mettre à jour les cooldowns dans le gameState
              if (!gameState.breedingCooldowns) {
                gameState.breedingCooldowns = {};
              }
              gameState.breedingCooldowns[pokemonId] = {
                lastBreedingTime: now,
                endTime: endTime
              };
              localStorage.setItem('gameState', JSON.stringify(gameState));
              console.log(`Pokemon lastBreedingTime sauvegardé directement dans localStorage.gameState pour ${pokemon.name}`);
            } else {
              console.warn(`Pokemon ${pokemon.name} non trouvé dans gameState, impossible de mettre à jour lastBreedingTime`);
            }
          }
        } catch (error) {
          console.error('Erreur lors de la mise à jour directe du lastBreedingTime dans gameState:', error);
        }
        
        // Enfin, sauvegarder l'état complet (en utilisant serialize qui gère breedingCooldowns)
        this.serialize();
        
        // Vérifier que la sauvegarde a bien fonctionné
        try {
          const verif1 = JSON.parse(localStorage.getItem('breedingCooldowns') || '{}');
          const verif2 = JSON.parse(localStorage.getItem('gameState') || '{}');
          
          console.log('Vérification après sauvegarde:');
          console.log(`- breedingCooldowns[${pokemonId}] = ${verif1[pokemonId] ? 'défini' : 'non défini'}`);
          
          const pokemonApres = verif2.pokemons?.find(p => p.uniqueId === pokemonId);
          console.log(`- gameState.pokemons[${pokemonId}].lastBreedingTime = ${pokemonApres?.lastBreedingTime ? 'défini' : 'non défini'}`);
        } catch (error) {
          console.error('Erreur lors de la vérification des données sauvegardées:', error);
        }
        
        this.notifyObservers('BREEDING_COOLDOWN_STARTED', {
          pokemonId: pokemonId,
          endTime: endTime,
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
        // Supprimer le cooldown de l'objet breedingCooldowns
        delete this.data.breedingCooldowns[pokemonId];
        
        // Supprimer lastBreedingTime du Pokémon aussi
        const pokemon = this.data.pokemons.find(p => p.uniqueId === pokemonId);
        if (pokemon) {
          delete pokemon.lastBreedingTime;
        }
        
        // Supprimer aussi dans le localStorage dédié
        try {
          const savedCooldowns = JSON.parse(localStorage.getItem('breedingCooldowns')) || {};
          if (savedCooldowns[pokemonId]) {
            delete savedCooldowns[pokemonId];
            localStorage.setItem('breedingCooldowns', JSON.stringify(savedCooldowns));
          }
        } catch (error) {
          console.error('Erreur lors de la suppression du cooldown dans localStorage:', error);
        }
        
        // Sauvegarder l'état
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
      // Vérifier d'abord si le Pokémon existe
      const pokemon = this.getPokemonById(pokemonId);
      if (!pokemon) {
        console.warn(`getBreedingCooldownProgress: Pokémon non trouvé pour l'ID ${pokemonId}`);
        return { progress: 100, timeLeft: 0 };
      }

      // Vérifier dans les cooldowns centralisés
      const cooldown = this.data.breedingCooldowns[pokemonId];
      
      // Vérifier aussi directement sur le Pokémon
      const pokemonHasBreedingTime = pokemon && pokemon.lastBreedingTime;
      
      if (!cooldown && !pokemonHasBreedingTime) {
        // Ni cooldown ni lastBreedingTime, donc pas de cooldown
        return { progress: 100, timeLeft: 0 };
      }

      const now = Date.now();
      
      // Si le Pokémon a un lastBreedingTime mais pas de cooldown centralisé,
      // créer un cooldown à partir du lastBreedingTime du Pokémon
      if (pokemonHasBreedingTime && !cooldown) {
        console.log(`Création d'un cooldown à partir du lastBreedingTime du Pokémon ${pokemon.name}`);
        const lastBreedingTime = Number(pokemon.lastBreedingTime);
        if (!isNaN(lastBreedingTime)) {
          const endTime = lastBreedingTime + this.breedingCooldownTime;
          
          if (endTime <= now) {
            // Le cooldown est déjà terminé
            delete pokemon.lastBreedingTime;
            this.serialize(); // Sauvegarder le changement
            return { progress: 100, timeLeft: 0 };
          }
          
          // Créer un cooldown à partir du lastBreedingTime
          this.data.breedingCooldowns[pokemonId] = {
            lastBreedingTime: lastBreedingTime,
            endTime: endTime
          };
          
          // Sauvegarder aussi dans le localStorage dédié
          try {
            const savedCooldowns = JSON.parse(localStorage.getItem('breedingCooldowns')) || {};
            savedCooldowns[pokemonId] = endTime;
            localStorage.setItem('breedingCooldowns', JSON.stringify(savedCooldowns));
          } catch (error) {
            console.error('Erreur lors de la sauvegarde du cooldown restauré:', error);
          }
        }
      }
      
      // Utiliser le cooldown centralisé (maintenant il devrait exister)
      const activeCooldown = this.data.breedingCooldowns[pokemonId];
      if (!activeCooldown) {
        // Si toujours pas de cooldown, retourner 100% complet
        return { progress: 100, timeLeft: 0 };
      }
      
      if (now >= activeCooldown.endTime) {
        // Le cooldown est terminé, nettoyer
        delete this.data.breedingCooldowns[pokemonId];
        
        // Supprimer également lastBreedingTime du Pokémon
        if (pokemon) {
          delete pokemon.lastBreedingTime;
        }
        
        // Supprimer aussi dans le localStorage dédié
        try {
          const savedCooldowns = JSON.parse(localStorage.getItem('breedingCooldowns')) || {};
          if (savedCooldowns[pokemonId]) {
            delete savedCooldowns[pokemonId];
            localStorage.setItem('breedingCooldowns', JSON.stringify(savedCooldowns));
          }
        } catch (error) {
          console.error('Erreur lors de la suppression du cooldown dans localStorage:', error);
        }
        
        // Sauvegarder l'état
        this.serialize();
        
        return { progress: 100, timeLeft: 0 };
      }

      const elapsed = now - activeCooldown.lastBreedingTime;
      const progress = (elapsed / this.breedingCooldownTime) * 100;
      const result = Math.min(100, Math.max(0, progress));
      const timeLeft = Math.round((activeCooldown.endTime - now) / 1000);
      
      console.log('Progression du cooldown:', {
        pokemonId: pokemonId,
        pokemonName: pokemon?.name,
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
        
        // Traiter les œufs pour s'assurer que les timestamps sont des nombres
        const processedEggs = (data.eggs || []).map(egg => ({
          ...egg,
          createdAt: Number(egg.createdAt) || Date.now(),
          lastShake: Number(egg.lastShake) || Date.now(),
          progress: Number(egg.progress) || 0
        }));

        // Essayer de charger les cooldowns du localStorage dédié
        let loadedCooldowns = {};
        try {
          const breedingCooldownsData = localStorage.getItem('breedingCooldowns');
          if (breedingCooldownsData) {
            loadedCooldowns = JSON.parse(breedingCooldownsData) || {};
            console.log('Cooldowns chargés du localStorage avant hydratation:', loadedCooldowns);
          }
        } catch (e) {
          console.error('Erreur lors du chargement des cooldowns de breeding:', e);
        }

        // Traiter les Pokémon pour s'assurer que lastBreedingTime est un nombre
        // et appliquer les cooldowns du localStorage si nécessaire
        const now = Date.now();
        const processedPokemons = (data.pokemons || []).map(pokemon => {
          // Créer une copie du Pokémon
          const processed = { ...pokemon };
          
          // Vérifier si ce Pokémon a un cooldown dans le localStorage dédié
          if (loadedCooldowns[pokemon.uniqueId]) {
            const endTime = Number(loadedCooldowns[pokemon.uniqueId]);
            if (!isNaN(endTime) && endTime > now) {
              processed.lastBreedingTime = endTime - this.breedingCooldownTime;
              console.log(`lastBreedingTime appliqué depuis cooldown pour ${pokemon.name} (${pokemon.uniqueId}): ${new Date(processed.lastBreedingTime).toISOString()}`);
            } else {
              // Si le cooldown est expiré, s'assurer qu'il n'y a pas de lastBreedingTime
              delete processed.lastBreedingTime;
            }
          } else if (pokemon.lastBreedingTime) {
            // Si le Pokémon a déjà un lastBreedingTime, vérifier qu'il est valide
            const lastBreedingTime = Number(pokemon.lastBreedingTime);
            const endTime = lastBreedingTime + this.breedingCooldownTime;
            
            if (!isNaN(lastBreedingTime) && endTime > now) {
              processed.lastBreedingTime = lastBreedingTime;
              // Ajouter aux cooldowns pour le sauvegarder plus tard
              loadedCooldowns[pokemon.uniqueId] = endTime;
              console.log(`Cooldown ajouté depuis lastBreedingTime pour ${pokemon.name}: ${Math.round((endTime - now) / 1000)}s restantes`);
            } else {
              // Si le cooldown est expiré ou invalide, supprimer lastBreedingTime
              delete processed.lastBreedingTime;
              console.log(`lastBreedingTime expiré supprimé pour ${pokemon.name}`);
            }
          }
          
          return processed;
        });

        // Construire les objets de cooldown à partir des informations collectées
        const mergedBreedingCooldowns = {};
        Object.entries(loadedCooldowns).forEach(([id, endTime]) => {
          const numEndTime = Number(endTime);
          if (!isNaN(numEndTime) && numEndTime > now) {
            const lastBreedingTime = numEndTime - this.breedingCooldownTime;
            mergedBreedingCooldowns[id] = {
              lastBreedingTime: lastBreedingTime,
              endTime: numEndTime
            };
          }
        });

        // Mettre à jour les données
        this.data = {
          ...this.data,
          pokemons: processedPokemons,
          eggs: processedEggs,
          photos: data.photos || [],
          userPokeballs: data.userPokeballs || 0,
          lastPokeballTime: data.lastPokeballTime || Date.now(),
          candyCount: data.candyCount || 0,
          breedingCooldowns: mergedBreedingCooldowns
        };

        // S'assurer que tout est synchronisé
        this.loadBreedingCooldowns();
        
        // Vérifier les cooldowns et les lastBreedingTime après tout le processus
        console.log('État final après hydratation:');
        console.log(`- ${this.data.pokemons.length} Pokémon chargés`);
        console.log(`- ${Object.keys(this.data.breedingCooldowns).length} cooldowns actifs`);
        
        // Vérifier que les lastBreedingTime sont bien synchronisés
        this.data.pokemons.forEach(pokemon => {
          if (pokemon.lastBreedingTime) {
            const cooldown = this.data.breedingCooldowns[pokemon.uniqueId];
            if (cooldown) {
              console.log(`Pokémon ${pokemon.name}: lastBreedingTime OK et cooldown présent`);
            } else {
              console.warn(`Pokémon ${pokemon.name} a un lastBreedingTime mais pas de cooldown correspondant`);
            }
          }
        });
        
        // Sauvegarder l'état après avoir tout synchronisé
        this.serialize();
        
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
        lastPokeballTime: this.data.lastPokeballTime || Date.now(),
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