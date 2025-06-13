// presenters/BattlePresenter.js - Présentateur pour gérer la logique de combat
class BattlePresenter {
  constructor(appStateModel, battleModel, uiView) {
    this.appStateModel = appStateModel;
    this.battleModel = battleModel;
    this.uiView = uiView;
    this.battleView = null;
    
    // État du combat
    this.currentBattle = {
      mode: null,          // 'wild', 'trainer', 'daily'
      playerTeam: [],      // L'équipe du joueur
      opponentTeam: [],    // L'équipe adverse (1 pour wild, plusieurs pour trainer)
      playerActivePokemon: null,
      opponentActivePokemon: null,
      isPlayerTurn: true,  // Indique si c'est au tour du joueur
      battleState: 'preparation', // 'preparation', 'active', 'finished'
      battleResult: null,  // 'victory', 'defeat', 'capture', 'run'
      rewards: {           // Récompenses potentielles
        xp: 0,
        candy: 0
      }
    };
  }
  
  // Initialiser la vue
  init(battleContainer) {
    this.battleView = new BattleView(battleContainer, this.appStateModel, this.uiView);
    
    // Configurer les callbacks
    this.setupCallbacks();
  }
  
  // Configurer les callbacks de la vue
  setupCallbacks() {
    // Callback pour la confirmation de l'équipe
    this.battleView.setOnTeamConfirmedCallback((pokemonIds, mode) => {
      this.startBattle(pokemonIds, mode);
    });
    
    // Callback pour la sélection d'une attaque
    this.battleView.setOnMoveSelectedCallback((move) => {
      this.executePlayerMove(move);
    });
    
    // Callback pour le changement de Pokémon
    this.battleView.setOnPokemonSelectedCallback((pokemonId) => {
      this.switchPlayerPokemon(pokemonId);
    });
    
    // Callback pour la tentative de capture
    this.battleView.setOnCatchAttemptCallback(() => {
      this.attemptCapture();
    });
    
    // Callback pour la fuite
    this.battleView.setOnRunCallback(() => {
      this.attemptRun();
    });
  }
  
  // Démarrer un combat
  async startBattle(pokemonIds, mode) {
    try {
      this.uiView.showLoader();
      
      // Réinitialiser l'état du combat
      this.currentBattle = {
        mode: mode,
        playerTeam: [],
        opponentTeam: [],
        playerActivePokemon: null,
        opponentActivePokemon: null,
        isPlayerTurn: true,
        battleState: 'preparation',
        battleResult: null,
        rewards: {
          xp: 0,
          candy: 0
        }
      };
      
      // Charger l'équipe du joueur
      await this.loadPlayerTeam(pokemonIds);
      
      // Créer l'équipe adverse en fonction du mode
      await this.createOpponentTeam(mode);
      
      // Démarrer le combat
      this.battleView.showBattleArena();
      
      // Définir les Pokémon actifs
      this.currentBattle.playerActivePokemon = this.currentBattle.playerTeam[0];
      this.currentBattle.opponentActivePokemon = this.currentBattle.opponentTeam[0];
      
      // Passer les données du combat à la vue
      this.battleView.currentBattle = { ...this.currentBattle };
      
      // Afficher les Pokémon sur le terrain
      this.battleView.displayPokemon(this.currentBattle.playerActivePokemon, true);
      this.battleView.displayPokemon(this.currentBattle.opponentActivePokemon, false);
      
      // Changer l'état du combat
      this.currentBattle.battleState = 'active';
      
      // Déterminer qui commence en fonction de la vitesse
      const firstAttacker = this.battleModel.determineFirstAttacker(
        this.currentBattle.playerActivePokemon,
        this.currentBattle.opponentActivePokemon
      );
      
      this.currentBattle.isPlayerTurn = firstAttacker === this.currentBattle.playerActivePokemon;
      
      // Ajouter le message initial au log
      const opponentName = this.capitalizeFirstLetter(this.currentBattle.opponentActivePokemon.name);
      const playerName = this.capitalizeFirstLetter(this.currentBattle.playerActivePokemon.name);
      
      let initialMessage = '';
      if (mode === 'wild') {
        initialMessage = `Un ${opponentName} sauvage apparaît !`;
      } else {
        initialMessage = `Le dresseur envoie ${opponentName} !`;
      }
      
      this.battleView.addBattleLog(initialMessage);
      this.battleView.addBattleLog(`Allez, ${playerName} !`);
      
      // Si c'est le tour de l'adversaire, exécuter son action
      if (!this.currentBattle.isPlayerTurn) {
        // Attendre un moment pour laisser le joueur voir ce qui se passe
        setTimeout(() => {
          this.executeOpponentMove();
        }, 1500);
      }
      
      this.uiView.hideLoader();
    } catch (error) {
      console.error('Erreur lors du démarrage du combat:', error);
      this.uiView.showNotification('Erreur lors du démarrage du combat');
      this.uiView.hideLoader();
    }
  }
  
  // Charger l'équipe du joueur
  async loadPlayerTeam(pokemonIds) {
    const playerPokemons = this.appStateModel.getPokemons();
    
    // Filtrer et préparer les Pokémon sélectionnés
    for (const pokemonId of pokemonIds) {
      const pokemon = playerPokemons.find(p => p.uniqueId === pokemonId);
      if (pokemon) {
        const battlePokemon = await this.battleModel.preparePokemonForBattle(pokemon);
        this.currentBattle.playerTeam.push(battlePokemon);
      }
    }
    
    console.log('Équipe du joueur chargée:', this.currentBattle.playerTeam);
  }
  
  // Créer l'équipe adverse
  async createOpponentTeam(mode) {
    try {
      // Calculer le niveau moyen de l'équipe du joueur
      const averageLevel = this.calculateAverageLevel(this.currentBattle.playerTeam);
      
      if (mode === 'wild') {
        // Combat contre un Pokémon sauvage
        const wildPokemon = await this.battleModel.createWildPokemon(averageLevel);
        this.currentBattle.opponentTeam = [wildPokemon];
      } else if (mode === 'trainer') {
        // Combat contre un dresseur
        const trainerTeam = await this.battleModel.createTrainerTeam(averageLevel, 'normal', 3);
        this.currentBattle.opponentTeam = trainerTeam;
      } else if (mode === 'daily') {
        // Défi quotidien
        const dailyTeam = await this.battleModel.createTrainerTeam(averageLevel, 'hard', 3);
        this.currentBattle.opponentTeam = dailyTeam;
      }
      
      console.log('Équipe adverse créée:', this.currentBattle.opponentTeam);
    } catch (error) {
      console.error('Erreur lors de la création de l\'équipe adverse:', error);
      throw error;
    }
  }
  
  // Calculer le niveau moyen d'une équipe
  calculateAverageLevel(team) {
    if (team.length === 0) return 5;
    
    const totalLevel = team.reduce((sum, pokemon) => sum + pokemon.level, 0);
    return Math.floor(totalLevel / team.length);
  }
  
  // Exécuter une attaque du joueur
  executePlayerMove(move) {
    if (this.currentBattle.battleState !== 'active' || !this.currentBattle.isPlayerTurn) {
      return;
    }
    
    // Réduire le PP de l'attaque
    move.current_pp--;
    
    // Mettre à jour l'affichage des attaques
    this.battleView.updateMoves(this.currentBattle.playerActivePokemon);
    
    // Revenir à l'affichage des actions
    this.battleView.toggleMovesDisplay(false);
    
    // Calculer les dégâts
    const attackResult = this.battleModel.calculateDamage(
      this.currentBattle.playerActivePokemon,
      this.currentBattle.opponentActivePokemon,
      move
    );
    
    // Ajouter le log d'attaque
    const playerName = this.capitalizeFirstLetter(this.currentBattle.playerActivePokemon.name);
    const opponentName = this.capitalizeFirstLetter(this.currentBattle.opponentActivePokemon.name);
    const moveName = this.capitalizeFirstLetter(move.name.replace('-', ' '));
    
    if (attackResult.hit) {
      // Afficher l'animation d'attaque
      this.battleView.showAttackAnimation(true, attackResult.effectiveness);
      
      // Réduire les PV de l'adversaire
      this.currentBattle.opponentActivePokemon.current_hp = Math.max(
        0,
        this.currentBattle.opponentActivePokemon.current_hp - attackResult.damage
      );
      
      // Mettre à jour la vue avec les dernières données de combat
      this.battleView.currentBattle = { ...this.currentBattle };
      
      // Mettre à jour la barre de vie
      this.battleView.updateHealthBar(this.currentBattle.opponentActivePokemon, false);
      
      // Log de l'attaque
      let effectivenessText = '';
      if (attackResult.effectiveness > 1.5) {
        effectivenessText = 'C\'est super efficace !';
      } else if (attackResult.effectiveness < 0.5 && attackResult.effectiveness > 0) {
        effectivenessText = 'Ce n\'est pas très efficace...';
      } else if (attackResult.effectiveness === 0) {
        effectivenessText = 'Ça n\'affecte pas ' + opponentName + '...';
      }
      
      let criticalText = attackResult.critical ? 'Coup critique !' : '';
      
      this.battleView.addBattleLog(`${playerName} utilise ${moveName}!`);
      
      if (effectivenessText) {
        this.battleView.addBattleLog(effectivenessText);
      }
      
      if (criticalText) {
        this.battleView.addBattleLog(criticalText);
      }
      
      if (attackResult.damage > 0) {
        this.battleView.addBattleLog(`${opponentName} perd ${attackResult.damage} PV!`);
      }
    } else {
      this.battleView.addBattleLog(`${playerName} utilise ${moveName}!`);
      this.battleView.addBattleLog(`${playerName} rate son attaque!`);
    }
    
    // Vérifier si le Pokémon adverse est K.O.
    if (this.currentBattle.opponentActivePokemon.current_hp <= 0) {
      this.handleOpponentFainted();
    } else {
      // Passer le tour à l'adversaire
      this.currentBattle.isPlayerTurn = false;
      
      // Synchroniser avec la vue
      this.battleView.currentBattle = { ...this.currentBattle };
      
      // Attendre un moment avant l'action de l'adversaire
      setTimeout(() => {
        this.executeOpponentMove();
      }, 1500);
    }
  }
  
  // Exécuter une attaque de l'adversaire
  executeOpponentMove() {
    if (this.currentBattle.battleState !== 'active' || this.currentBattle.isPlayerTurn) {
      return;
    }
    
    // Sélectionner une attaque aléatoire
    const move = this.battleModel.selectRandomMove(this.currentBattle.opponentActivePokemon);
    
    if (!move) {
      // Si plus d'attaques disponibles, utiliser struggle
      this.battleView.addBattleLog(`${this.capitalizeFirstLetter(this.currentBattle.opponentActivePokemon.name)} n'a plus d'attaques disponibles!`);
      return;
    }
    
    // Réduire le PP de l'attaque
    move.current_pp--;
    
    // Calculer les dégâts
    const attackResult = this.battleModel.calculateDamage(
      this.currentBattle.opponentActivePokemon,
      this.currentBattle.playerActivePokemon,
      move
    );
    
    // Ajouter le log d'attaque
    const opponentName = this.capitalizeFirstLetter(this.currentBattle.opponentActivePokemon.name);
    const playerName = this.capitalizeFirstLetter(this.currentBattle.playerActivePokemon.name);
    const moveName = this.capitalizeFirstLetter(move.name.replace('-', ' '));
    
    if (attackResult.hit) {
      // Afficher l'animation d'attaque
      this.battleView.showAttackAnimation(false, attackResult.effectiveness);
      
      // Réduire les PV du joueur
      this.currentBattle.playerActivePokemon.current_hp = Math.max(
        0,
        this.currentBattle.playerActivePokemon.current_hp - attackResult.damage
      );
      
      // Mettre à jour la vue avec les dernières données de combat
      this.battleView.currentBattle = { ...this.currentBattle };
      
      // Mettre à jour la barre de vie
      this.battleView.updateHealthBar(this.currentBattle.playerActivePokemon, true);
      
      // Log de l'attaque
      let effectivenessText = '';
      if (attackResult.effectiveness > 1.5) {
        effectivenessText = 'C\'est super efficace !';
      } else if (attackResult.effectiveness < 0.5 && attackResult.effectiveness > 0) {
        effectivenessText = 'Ce n\'est pas très efficace...';
      } else if (attackResult.effectiveness === 0) {
        effectivenessText = 'Ça n\'affecte pas ' + playerName + '...';
      }
      
      let criticalText = attackResult.critical ? 'Coup critique !' : '';
      
      this.battleView.addBattleLog(`${opponentName} utilise ${moveName}!`);
      
      if (effectivenessText) {
        this.battleView.addBattleLog(effectivenessText);
      }
      
      if (criticalText) {
        this.battleView.addBattleLog(criticalText);
      }
      
      if (attackResult.damage > 0) {
        this.battleView.addBattleLog(`${playerName} perd ${attackResult.damage} PV!`);
      }
    } else {
      this.battleView.addBattleLog(`${opponentName} utilise ${moveName}!`);
      this.battleView.addBattleLog(`${opponentName} rate son attaque!`);
    }
    
    // Vérifier si le Pokémon du joueur est K.O.
    if (this.currentBattle.playerActivePokemon.current_hp <= 0) {
      this.handlePlayerFainted();
    } else {
      // Passer le tour au joueur
      this.currentBattle.isPlayerTurn = true;
      
      // Synchroniser avec la vue
      this.battleView.currentBattle = { ...this.currentBattle };
    }
  }
  
  // Gérer le K.O. du Pokémon adverse
  handleOpponentFainted() {
    const opponentName = this.capitalizeFirstLetter(this.currentBattle.opponentActivePokemon.name);
    this.battleView.addBattleLog(`${opponentName} est K.O.!`);
    
    // Ajouter l'XP au Pokémon actif du joueur
    const expGained = Math.floor(this.currentBattle.opponentActivePokemon.level * 3.5);
    this.currentBattle.rewards.xp += expGained;
    
    this.battleView.addBattleLog(`${this.capitalizeFirstLetter(this.currentBattle.playerActivePokemon.name)} gagne ${expGained} points d'expérience!`);
    
    // Trouver le prochain Pokémon adverse qui n'est pas K.O.
    const remainingOpponents = this.currentBattle.opponentTeam.filter(p => p.current_hp > 0 && p !== this.currentBattle.opponentActivePokemon);
    
    if (remainingOpponents.length === 0) {
      // Victoire !
      this.handleBattleVictory();
    } else {
      // Envoyer le prochain Pokémon
      const nextOpponent = remainingOpponents[0];
      this.currentBattle.opponentActivePokemon = nextOpponent;
      
      this.battleView.addBattleLog(`L'adversaire envoie ${this.capitalizeFirstLetter(nextOpponent.name)}!`);
      this.battleView.displayPokemon(nextOpponent, false);
      
      // Passer le tour au joueur
      this.currentBattle.isPlayerTurn = true;
    }
  }
  
  // Gérer le K.O. du Pokémon du joueur
  handlePlayerFainted() {
    const playerName = this.capitalizeFirstLetter(this.currentBattle.playerActivePokemon.name);
    this.battleView.addBattleLog(`${playerName} est K.O.!`);
    
    // Trouver les Pokémon de l'équipe du joueur qui ne sont pas K.O.
    const remainingPokemons = this.currentBattle.playerTeam.filter(p => p.current_hp > 0);
    
    if (remainingPokemons.length === 0) {
      // Défaite !
      this.handleBattleDefeat();
    } else {
      // Mettre à jour l'état du combat pour indiquer qu'un changement forcé est nécessaire
      this.battleView.addBattleLog(`Vous devez changer de Pokémon!`);
      
      // Passer les données du combat à la vue
      this.battleView.currentBattle = this.currentBattle;
      
      // Montrer l'écran de changement de Pokémon avec le flag "forcé" à true
      setTimeout(() => {
        this.showPokemonSwitchScreen(true);
      }, 1000);
    }
  }
  
  // Gérer la victoire
  handleBattleVictory() {
    this.currentBattle.battleState = 'finished';
    this.currentBattle.battleResult = 'victory';
    
    // Calculer les récompenses
    if (this.currentBattle.mode === 'trainer' || this.currentBattle.mode === 'daily') {
      this.currentBattle.rewards.candy += this.currentBattle.mode === 'daily' ? 2 : 1;
    }
    
    // Ajouter un message de victoire
    this.battleView.addBattleLog(`Victoire !`);
    this.battleView.addBattleLog(`Vous gagnez ${this.currentBattle.rewards.xp} points d'expérience et ${this.currentBattle.rewards.candy} bonbon${this.currentBattle.rewards.candy > 1 ? 's' : ''} !`);
    
    // Attendre un moment avant d'afficher le résumé
    setTimeout(() => {
      this.showBattleSummary();
    }, 2000);
  }
  
  // Gérer la défaite
  handleBattleDefeat() {
    this.currentBattle.battleState = 'finished';
    this.currentBattle.battleResult = 'defeat';
    
    // Ajouter un message de défaite
    this.battleView.addBattleLog(`Défaite !`);
    
    // Attendre un moment avant d'afficher le résumé
    setTimeout(() => {
      this.showBattleSummary();
    }, 2000);
  }
  
  // Afficher l'écran de sélection de Pokémon
  showPokemonSwitchScreen(isFainted = false) {
    // Stocker l'information si le changement est dû à un K.O.
    this.isForcedSwitch = isFainted;
    
    // Passer les données du combat actuel à la vue
    this.battleView.currentBattle = this.currentBattle;
    // Indiquer à la vue si le changement est forcé
    this.battleView.forcedSwitch = isFainted;
    
    // Afficher l'écran de sélection
    this.battleView.showPokemonSwitchOptions();
  }
  
  // Changer le Pokémon actif du joueur
  switchPlayerPokemon(pokemonId) {
    // Trouver le Pokémon sélectionné dans l'équipe
    const selectedPokemon = this.currentBattle.playerTeam.find(
      p => p.uniqueId === pokemonId
    );
    
    if (!selectedPokemon) {
      this.battleView.addBattleLog("Erreur: Pokémon non trouvé");
      return;
    }
    
    // Récupérer le nom du Pokémon actuel pour le log
    const currentPokemonName = this.currentBattle.playerActivePokemon 
      ? this.capitalizeFirstLetter(this.currentBattle.playerActivePokemon.name) 
      : "";
    
    // Mettre à jour le Pokémon actif
    this.currentBattle.playerActivePokemon = selectedPokemon;
    
    // Afficher le nouveau Pokémon
    this.battleView.displayPokemon(selectedPokemon, true);
    
    // Ajouter un message au log
    this.battleView.addBattleLog(`${currentPokemonName ? currentPokemonName + " revient ! " : ""}Allez, ${this.capitalizeFirstLetter(selectedPokemon.name)} !`);
    
    // Si le changement n'est pas forcé (par K.O.), passer le tour à l'adversaire
    if (!this.isForcedSwitch) {
      this.currentBattle.isPlayerTurn = false;
      
      // Exécuter l'action de l'adversaire après un délai
      setTimeout(() => {
        this.executeOpponentMove();
      }, 1500);
    } else {
      // Réinitialiser le flag pour le prochain changement
      this.isForcedSwitch = false;
      this.battleView.forcedSwitch = false;
      
      // C'est toujours au tour de l'adversaire (puisque c'est son attaque qui a mis K.O. le Pokémon)
      this.currentBattle.isPlayerTurn = false;
      
      // Exécuter l'action de l'adversaire après un délai
      setTimeout(() => {
        this.executeOpponentMove();
      }, 1500);
    }
  }
  
  // Tenter de capturer le Pokémon sauvage
  attemptCapture() {
    if (this.currentBattle.mode !== 'wild' || this.currentBattle.battleState !== 'active') {
      this.battleView.addBattleLog("Vous ne pouvez pas capturer ce Pokémon !");
      return;
    }
    
    // Vérifier si le joueur a des Pokéballs
    if (this.appStateModel.getUserPokeballs() <= 0) {
      this.battleView.addBattleLog("Vous n'avez plus de Pokéballs !");
      return;
    }
    
    // Consommer une Pokéball
    this.appStateModel.decrementPokeballs();
    
    // Calculer les chances de capture
    // Formule simplifiée: (1 - HP_actuel/HP_max) * 0.75 + 0.15
    const pokemon = this.currentBattle.opponentActivePokemon;
    const healthRatio = pokemon.current_hp / pokemon.stats.hp;
    let captureChance = (1 - healthRatio) * 0.75 + 0.15;
    
    // Limiter entre 0.1 et 0.9
    captureChance = Math.min(0.9, Math.max(0.1, captureChance));
    
    this.battleView.addBattleLog("Vous lancez une Pokéball !");
    
    // Décider si la capture réussit
    const isSuccess = Math.random() < captureChance;
    
    // Afficher l'animation de capture
    setTimeout(() => {
      if (isSuccess) {
        this.handleCaptureSuccess();
      } else {
        this.handleCaptureFailure();
      }
    }, 2000);
  }
  
  // Gérer la réussite de la capture
  handleCaptureSuccess() {
    const pokemon = this.currentBattle.opponentActivePokemon;
    
    this.battleView.addBattleLog(`Félicitations ! ${this.capitalizeFirstLetter(pokemon.name)} a été capturé !`);
    
    // Ajouter le Pokémon à la collection
    const simplifiedPokemon = {
      id: pokemon.id,
      name: pokemon.name,
      level: pokemon.level,
      types: pokemon.types.map(type => ({ type: { name: type } })),
      sprites: { front_default: pokemon.sprites.front_default },
    };
    
    this.appStateModel.addPokemon(simplifiedPokemon);
    
    // Mettre à jour l'état du combat
    this.currentBattle.battleState = 'finished';
    this.currentBattle.battleResult = 'capture';
    
    // Afficher le résumé du combat
    setTimeout(() => {
      this.showBattleSummary();
    }, 1500);
  }
  
  // Gérer l'échec de la capture
  handleCaptureFailure() {
    this.battleView.addBattleLog("Oh non ! Le Pokémon s'est échappé !");
    
    // Passer le tour à l'adversaire
    this.currentBattle.isPlayerTurn = false;
    
    // Exécuter l'action de l'adversaire
    setTimeout(() => {
      this.executeOpponentMove();
    }, 1000);
  }
  
  // Tenter de fuir
  attemptRun() {
    if (this.currentBattle.battleState !== 'active') {
      return;
    }
    
    if (this.currentBattle.mode === 'trainer' || this.currentBattle.mode === 'daily') {
      this.battleView.addBattleLog("Vous ne pouvez pas fuir un combat contre un dresseur !");
      return;
    }
    
    // Calculer les chances de fuite (simplifiées)
    // Plus le Pokémon du joueur est rapide par rapport à l'adversaire, plus les chances sont élevées
    const playerSpeed = this.currentBattle.playerActivePokemon.stats.speed;
    const opponentSpeed = this.currentBattle.opponentActivePokemon.stats.speed;
    
    let escapeChance = 0.5 + (playerSpeed - opponentSpeed) * 0.01;
    
    // Limiter entre 0.25 et 0.95
    escapeChance = Math.min(0.95, Math.max(0.25, escapeChance));
    
    const isSuccess = Math.random() < escapeChance;
    
    if (isSuccess) {
      this.battleView.addBattleLog("Vous avez réussi à fuir !");
      
      // Mettre à jour l'état du combat
      this.currentBattle.battleState = 'finished';
      this.currentBattle.battleResult = 'run';
      
      // Revenir à l'écran de préparation
      setTimeout(() => {
        this.battleView.showBattlePreparation();
      }, 1500);
    } else {
      this.battleView.addBattleLog("Vous n'avez pas réussi à fuir !");
      
      // Passer le tour à l'adversaire
      this.currentBattle.isPlayerTurn = false;
      
      // Exécuter l'action de l'adversaire
      setTimeout(() => {
        this.executeOpponentMove();
      }, 1000);
    }
  }
  
  // Afficher le résumé du combat
  showBattleSummary() {
    // Créer un élément pour le résumé
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'battle-summary';
    
    // Déterminer le titre en fonction du résultat
    let title = '';
    let imageUrl = '';
    
    switch (this.currentBattle.battleResult) {
      case 'victory':
        title = 'Victoire !';
        imageUrl = 'images/victory.svg';
        break;
      case 'defeat':
        title = 'Défaite !';
        imageUrl = 'images/defeat.svg';
        break;
      case 'capture':
        title = 'Capture réussie !';
        // Utiliser l'image du Pokémon capturé
        imageUrl = this.currentBattle.opponentActivePokemon.sprites.front_default;
        break;
      case 'run':
        title = 'Fuite réussie !';
        imageUrl = 'images/run.svg';
        break;
    }
    
    // Construire le contenu HTML du résumé
    let rewardsHtml = '';
    if (this.currentBattle.battleResult === 'victory' || this.currentBattle.battleResult === 'capture') {
      rewardsHtml = `
        <div class="battle-rewards">
          <h3>Récompenses :</h3>
          <div class="reward-item">
            <img src="images/xp.svg" alt="XP">
            <span>${this.currentBattle.rewards.xp} XP</span>
          </div>
          ${this.currentBattle.rewards.candy > 0 ? `
            <div class="reward-item">
              <img src="images/super-bonbon.png" alt="Bonbons">
              <span>${this.currentBattle.rewards.candy} bonbon${this.currentBattle.rewards.candy > 1 ? 's' : ''}</span>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    summaryContainer.innerHTML = `
      <div class="summary-content">
        <h2>${title}</h2>
        <div class="summary-image">
          <img src="${imageUrl}" alt="${title}">
        </div>
        ${rewardsHtml}
        <button class="action-button continue-btn">Continuer</button>
      </div>
    `;
    
    // Ajouter à l'arène de combat
    const battleArena = document.getElementById('battle-arena');
    battleArena.appendChild(summaryContainer);
    
    // Ajouter l'écouteur d'événement pour le bouton continuer
    const continueBtn = summaryContainer.querySelector('.continue-btn');
    continueBtn.addEventListener('click', () => {
      // Retirer le résumé
      summaryContainer.remove();
      
      // Revenir à l'écran de préparation
      this.battleView.showBattlePreparation();
    });
    
    // Appliquer les récompenses
    this.applyBattleRewards();
  }
  
  // Appliquer les récompenses du combat
  applyBattleRewards() {
    if (this.currentBattle.battleResult === 'victory' || this.currentBattle.battleResult === 'capture') {
      // Ajouter l'XP aux Pokémon
      this.currentBattle.playerTeam.forEach(pokemon => {
        // Trouver le Pokémon correspondant dans la collection
        const collectionPokemon = this.appStateModel.getPokemonById(pokemon.uniqueId);
        if (collectionPokemon) {
          const currentLevel = collectionPokemon.level || 1;
          const xpGained = Math.floor(this.currentBattle.rewards.xp / this.currentBattle.playerTeam.length);
          
          // Simuler une montée de niveau basique
          const newLevel = Math.min(100, currentLevel + Math.floor(xpGained / 50));
          
          // Mettre à jour le niveau
          if (newLevel > currentLevel) {
            collectionPokemon.level = newLevel;
            console.log(`${collectionPokemon.name} est monté au niveau ${newLevel}!`);
          }
        }
      });
      
      // Ajouter les bonbons
      if (this.currentBattle.rewards.candy > 0) {
        this.appStateModel.incrementCandyCount(this.currentBattle.rewards.candy);
        console.log(`Ajout de ${this.currentBattle.rewards.candy} bonbons`);
      }
    }
    
    // Sauvegarder les changements
    this.appStateModel.serialize();
  }
  
  // Méthode utilitaire pour capitaliser la première lettre
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
} 