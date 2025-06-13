// models/BattleModel.js - Modèle pour gérer les combats Pokémon
class BattleModel {
  constructor(appStateModel) {
    this.appStateModel = appStateModel;
    this.battleCache = new Map(); // Cache pour les données de combat
    this.typeEffectivenessCache = null; // Cache pour les relations de types
    
    // Charger le cache des types depuis localStorage si disponible
    this.loadTypeEffectivenessCache();
  }

  // Prépare un Pokémon pour le combat en récupérant les données nécessaires
  async preparePokemonForBattle(pokemon, moveLimit = 4) {
    // Vérifier si on a déjà les données de combat en cache
    const cacheKey = `battle_${pokemon.id}`;
    if (this.battleCache.has(cacheKey)) {
      const cachedData = this.battleCache.get(cacheKey);
      
      // Clone les données et applique le niveau du Pokémon actuel
      const battleData = this.cloneBattleData(cachedData);
      battleData.level = pokemon.level || 5;
      battleData.uniqueId = pokemon.uniqueId;
      
      // Recalculer les stats en fonction du niveau
      this.calculateFinalStats(battleData);
      
      return battleData;
    }

    try {
      // Récupérer les détails complets du Pokémon depuis l'API
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des données du Pokémon: ${response.status}`);
      }

      const pokemonData = await response.json();
      
      // Récupérer les capacités (moves) du Pokémon
      let moves = [];
      if (pokemonData.moves && pokemonData.moves.length > 0) {
        // Sélectionner aléatoirement un nombre limité de capacités
        const randomMoves = this.getRandomElements(pokemonData.moves, Math.min(moveLimit, pokemonData.moves.length));
        
        // Récupérer les détails de chaque capacité
        moves = await Promise.all(
          randomMoves.map(async moveEntry => {
            try {
              const moveResponse = await fetch(moveEntry.move.url);
              if (!moveResponse.ok) {
                throw new Error(`Erreur lors de la récupération des détails de la capacité: ${moveResponse.status}`);
              }
              
              const moveData = await moveResponse.json();
              
              // Ne garder que les capacités de dégâts (avec power)
              if (moveData.power) {
                return {
                  name: moveData.name,
                  power: moveData.power || 0,
                  accuracy: moveData.accuracy || 100,
                  pp: moveData.pp || 10,
                  current_pp: moveData.pp || 10,
                  type: moveData.type?.name || 'normal'
                };
              }
              return null;
            } catch (error) {
              console.error(`Erreur lors de la récupération des détails de la capacité:`, error);
              return null;
            }
          })
        );
        
        // Filtrer les capacités null
        moves = moves.filter(move => move !== null);
      }
      
      // Si aucune capacité n'a été trouvée, ajouter "struggle" comme capacité par défaut
      if (moves.length === 0) {
        moves.push({
          name: "struggle",
          power: 50,
          accuracy: 100,
          pp: 10,
          current_pp: 10,
          type: "normal"
        });
      }

      // Créer l'objet de données de combat
      const battleData = {
        id: pokemon.id,
        uniqueId: pokemon.uniqueId,
        name: pokemon.name,
        sprites: {
          front_default: pokemonData.sprites.front_default,
          back_default: pokemonData.sprites.back_default || pokemonData.sprites.front_default // Fallback si back n'existe pas
        },
        base_stats: {
          hp: this.findStatValue(pokemonData.stats, 'hp'),
          attack: this.findStatValue(pokemonData.stats, 'attack'),
          defense: this.findStatValue(pokemonData.stats, 'defense'),
          speed: this.findStatValue(pokemonData.stats, 'speed'),
          special_attack: this.findStatValue(pokemonData.stats, 'special-attack'),
          special_defense: this.findStatValue(pokemonData.stats, 'special-defense')
        },
        stats: {}, // Sera calculé plus tard
        current_hp: 0, // Sera calculé plus tard
        types: pokemonData.types.map(t => t.type.name),
        moves: moves,
        level: pokemon.level || 5
      };

      // Calculer les stats finales
      this.calculateFinalStats(battleData);
      
      // Mettre en cache les données pour utilisation future
      this.battleCache.set(cacheKey, this.cloneBattleData(battleData));

      return battleData;
    } catch (error) {
      console.error(`Erreur lors de la préparation du Pokémon pour le combat:`, error);
      throw error;
    }
  }

  // Trouve la valeur d'une stat spécifique dans le tableau de stats
  findStatValue(stats, statName) {
    const stat = stats.find(s => s.stat.name === statName);
    return stat ? stat.base_stat : 50; // Valeur par défaut si la stat n'est pas trouvée
  }

  // Calcule les stats finales en fonction du niveau
  calculateFinalStats(pokemon) {
    // Formule: stat_finale = (base_stat * 2 * niveau) / 100 + 5
    // Pour les PV: hp = (base_hp * 2 * niveau) / 100 + niveau + 10
    
    pokemon.stats = {
      hp: Math.floor((pokemon.base_stats.hp * 2 * pokemon.level) / 100 + pokemon.level + 10),
      attack: Math.floor((pokemon.base_stats.attack * 2 * pokemon.level) / 100 + 5),
      defense: Math.floor((pokemon.base_stats.defense * 2 * pokemon.level) / 100 + 5),
      speed: Math.floor((pokemon.base_stats.speed * 2 * pokemon.level) / 100 + 5),
      special_attack: Math.floor((pokemon.base_stats.special_attack * 2 * pokemon.level) / 100 + 5),
      special_defense: Math.floor((pokemon.base_stats.special_defense * 2 * pokemon.level) / 100 + 5)
    };
    
    // Initialiser les PV actuels aux PV max au début du combat
    pokemon.current_hp = pokemon.stats.hp;
    
    return pokemon;
  }

  // Calcule les dégâts d'une attaque
  calculateDamage(attacker, defender, move) {
    // Vérifier si l'attaque touche (précision)
    const accuracy = move.accuracy || 100;
    if (Math.random() * 100 > accuracy) {
      return { damage: 0, effectiveness: 1, hit: false, critical: false };
    }

    // Chance de coup critique (6.25%)
    const isCritical = Math.random() < 0.0625;
    const criticalMultiplier = isCritical ? 1.5 : 1;
    
    // Calculer l'efficacité de type
    const typeEffectiveness = this.calculateTypeEffectiveness(move.type, defender.types);
    
    // Formule simplifiée: ((2 * level / 5 + 2) * move_power * attack / defense / 50 + 2) * STAB * type_effectiveness * critical
    const stab = attacker.types.includes(move.type) ? 1.5 : 1; // Same Type Attack Bonus
    
    // Déterminer si on utilise l'attaque/défense spéciale ou physique
    // Simplification: les types feu, eau, électrique, psy, glace, dragon, plante sont spéciaux
    const specialTypes = ['fire', 'water', 'electric', 'psychic', 'ice', 'dragon', 'grass'];
    const isSpecial = specialTypes.includes(move.type);
    
    const attackStat = isSpecial ? attacker.stats.special_attack : attacker.stats.attack;
    const defenseStat = isSpecial ? defender.stats.special_defense : defender.stats.defense;
    
    // Calculer les dégâts de base
    let damage = ((2 * attacker.level / 5 + 2) * move.power * attackStat / defenseStat / 50 + 2);
    
    // Appliquer les multiplicateurs
    damage = Math.floor(damage * stab * typeEffectiveness * criticalMultiplier);
    
    // Random factor (85-100%)
    const randomFactor = (85 + Math.floor(Math.random() * 16)) / 100;
    damage = Math.floor(damage * randomFactor);
    
    // Assurer un minimum de 1 dégât si l'attaque touche
    damage = Math.max(1, damage);
    
    return {
      damage,
      effectiveness: typeEffectiveness,
      hit: true,
      critical: isCritical
    };
  }

  // Sélectionner aléatoirement des éléments d'un tableau
  getRandomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Clone les données de combat pour éviter les références croisées
  cloneBattleData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  // Charger le cache des efficacités de types
  async loadTypeEffectivenessCache() {
    // Essayer de charger depuis localStorage
    const cachedData = localStorage.getItem('typeEffectivenessCache');
    if (cachedData) {
      try {
        this.typeEffectivenessCache = JSON.parse(cachedData);
        console.log('Cache des types chargé depuis localStorage');
        return;
      } catch (error) {
        console.error('Erreur lors du chargement du cache des types:', error);
      }
    }

    // Si pas de cache ou erreur, construire le cache
    try {
      const typeRelations = {};
      
      // Récupérer les 18 types de Pokémon
      const types = [
        'normal', 'fire', 'water', 'electric', 'grass', 'ice', 
        'fighting', 'poison', 'ground', 'flying', 'psychic', 
        'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
      ];
      
      // Récupérer les relations d'efficacité pour chaque type
      for (const type of types) {
        const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
        if (!response.ok) {
          throw new Error(`Erreur lors de la récupération des relations de type: ${response.status}`);
        }
        
        const typeData = await response.json();
        const relations = typeData.damage_relations;
        
        typeRelations[type] = {
          double_damage_to: relations.double_damage_to.map(t => t.name),
          half_damage_to: relations.half_damage_to.map(t => t.name),
          no_damage_to: relations.no_damage_to.map(t => t.name)
        };
      }
      
      // Sauvegarder le cache
      this.typeEffectivenessCache = typeRelations;
      localStorage.setItem('typeEffectivenessCache', JSON.stringify(typeRelations));
      
      console.log('Cache des types construit et sauvegardé');
    } catch (error) {
      console.error('Erreur lors de la construction du cache des types:', error);
      // Créer un cache vide en cas d'erreur
      this.typeEffectivenessCache = {};
    }
  }

  // Calculer l'efficacité de type d'une attaque contre un Pokémon
  calculateTypeEffectiveness(moveType, defenderTypes) {
    // Si le cache n'est pas encore chargé, retourner 1 (efficacité normale)
    if (!this.typeEffectivenessCache || !this.typeEffectivenessCache[moveType]) {
      return 1;
    }
    
    const relations = this.typeEffectivenessCache[moveType];
    let effectiveness = 1;
    
    // Calculer l'efficacité pour chaque type du défenseur
    for (const defenderType of defenderTypes) {
      // Doublement efficace
      if (relations.double_damage_to.includes(defenderType)) {
        effectiveness *= 2;
      }
      // Moitié moins efficace
      if (relations.half_damage_to.includes(defenderType)) {
        effectiveness *= 0.5;
      }
      // Pas efficace du tout
      if (relations.no_damage_to.includes(defenderType)) {
        effectiveness *= 0;
      }
    }
    
    return effectiveness;
  }

  // Créer un Pokémon sauvage aléatoire d'un niveau similaire à l'équipe du joueur
  async createWildPokemon(playerTeamLevel) {
    try {
      // Déterminer le niveau du Pokémon sauvage (±2 niveaux par rapport à la moyenne de l'équipe)
      const wildLevel = Math.max(1, Math.floor(playerTeamLevel + (Math.random() * 4 - 2)));
      
      // Récupérer un ID aléatoire (limité aux ~900 premiers Pokémon pour éviter les formes spéciales)
      const randomId = Math.floor(Math.random() * 898) + 1;
      
      // Récupérer les données du Pokémon
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération du Pokémon sauvage: ${response.status}`);
      }
      
      const pokemonData = await response.json();
      
      // Créer un objet Pokémon simplifié
      const wildPokemon = {
        id: pokemonData.id,
        name: pokemonData.name,
        level: wildLevel,
        types: pokemonData.types.map(t => t.type.name)
      };
      
      // Préparer le Pokémon pour le combat
      return await this.preparePokemonForBattle(wildPokemon);
    } catch (error) {
      console.error('Erreur lors de la création du Pokémon sauvage:', error);
      throw error;
    }
  }

  // Créer un dresseur IA avec une équipe de Pokémon adaptée au niveau du joueur
  async createTrainerTeam(playerTeamLevel, difficulty = 'normal', teamSize = 3) {
    try {
      const trainerTeam = [];
      
      // Ajuster le niveau en fonction de la difficulté
      let levelAdjustment = 0;
      switch (difficulty) {
        case 'easy': levelAdjustment = -2; break;
        case 'normal': levelAdjustment = 0; break;
        case 'hard': levelAdjustment = 2; break;
        case 'expert': levelAdjustment = 5; break;
      }
      
      // Créer l'équipe de Pokémon
      for (let i = 0; i < teamSize; i++) {
        // Générer un ID aléatoire (limité aux ~900 premiers Pokémon)
        const randomId = Math.floor(Math.random() * 898) + 1;
        
        // Ajuster le niveau (progressivement plus difficile)
        const pokemonLevel = Math.max(1, Math.floor(playerTeamLevel + levelAdjustment + (i * 1)));
        
        // Récupérer les données du Pokémon
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        if (!response.ok) continue; // Passer au suivant en cas d'erreur
        
        const pokemonData = await response.json();
        
        // Créer un objet Pokémon simplifié
        const trainerPokemon = {
          id: pokemonData.id,
          name: pokemonData.name,
          level: pokemonLevel,
          types: pokemonData.types.map(t => t.type.name)
        };
        
        // Préparer le Pokémon pour le combat
        const battlePokemon = await this.preparePokemonForBattle(trainerPokemon);
        trainerTeam.push(battlePokemon);
      }
      
      return trainerTeam;
    } catch (error) {
      console.error('Erreur lors de la création de l\'équipe du dresseur:', error);
      throw error;
    }
  }

  // Déterminer qui attaque en premier en fonction de la vitesse
  determineFirstAttacker(pokemon1, pokemon2) {
    return pokemon1.stats.speed >= pokemon2.stats.speed ? pokemon1 : pokemon2;
  }

  // Sélectionner une attaque aléatoire pour l'IA
  selectRandomMove(pokemon) {
    // Filtrer les moves avec PP restant
    const availableMoves = pokemon.moves.filter(move => move.current_pp > 0);
    
    // Si aucun move disponible, retourner null
    if (availableMoves.length === 0) return null;
    
    // Sélectionner un move aléatoire
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  // Réinitialiser un Pokémon pour un nouveau combat
  resetPokemonForBattle(pokemon) {
    // Restaurer les PV
    pokemon.current_hp = pokemon.stats.hp;
    
    // Restaurer les PP de toutes les attaques
    pokemon.moves.forEach(move => {
      move.current_pp = move.pp;
    });
    
    return pokemon;
  }
} 