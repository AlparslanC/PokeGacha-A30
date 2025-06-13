// views/BattleView.js - Vue pour l'interface de combat
class BattleView extends BaseView {
  constructor(containerElement, appStateModel, uiView) {
    super();
    this.container = containerElement;
    this.appStateModel = appStateModel;
    this.uiView = uiView;
    
    // Éléments de l'interface
    this.battleContainer = null;
    this.playerContainer = null;
    this.opponentContainer = null;
    this.actionsContainer = null;
    this.battleLogContainer = null;
    this.teamSelectorContainer = null;
    
    // État actuel du combat
    this.currentBattle = null;
    
    // Callbacks
    this.onMoveSelectedCallback = null;
    this.onPokemonSelectedCallback = null;
    this.onCatchAttemptCallback = null;
    this.onRunCallback = null;
    this.onTeamConfirmedCallback = null;
    
    // Initialiser la vue
    this.init();
  }
  
  init() {
    // Créer la structure de base de l'interface
    this.createBattleInterface();
  }
  
  // Créer l'interface de combat
  createBattleInterface() {
    this.container.innerHTML = `
      <div class="battle-preparation" id="battle-preparation">
        <h2>Préparez-vous au combat !</h2>
        
        <div class="battle-modes">
          <div class="battle-mode-card" data-mode="wild">
            <img src="images/wild-pokemon.svg" alt="Pokémon Sauvage">
            <h3>Pokémon Sauvage</h3>
            <p>Affrontez un Pokémon sauvage et tentez de le capturer !</p>
          </div>
          
          <div class="battle-mode-card" data-mode="trainer">
            <img src="images/trainer-battle.svg" alt="Dresseur">
            <h3>Dresseur</h3>
            <p>Défiez un dresseur et gagnez des récompenses !</p>
          </div>
          
          <div class="battle-mode-card" data-mode="daily">
            <img src="images/daily-challenge.svg" alt="Défi Quotidien">
            <h3>Défi Quotidien</h3>
            <p>Un combat spécial une fois par jour avec des récompenses exclusives !</p>
          </div>
        </div>
        
        <div class="team-selection-container" id="team-selection-container">
          <h3>Sélectionnez votre équipe (3-6 Pokémon)</h3>
          <div class="team-selection" id="team-selection"></div>
          <div class="team-preview" id="team-preview"></div>
          
          <div class="team-controls">
            <button id="confirm-team" class="action-button" disabled>Confirmer l'équipe</button>
          </div>
        </div>
      </div>
      
      <div class="battle-arena" id="battle-arena" style="display:none;">
        <div class="opponent-container" id="opponent-container">
          <div class="pokemon-info">
            <div class="pokemon-name-level">
              <span class="pokemon-name"></span>
              <span class="pokemon-level"></span>
            </div>
            <div class="hp-container">
              <div class="hp-bar">
                <div class="hp-fill"></div>
              </div>
              <div class="hp-text"></div>
            </div>
          </div>
          <div class="pokemon-sprite"></div>
        </div>
        
        <div class="player-container" id="player-container">
          <div class="pokemon-sprite"></div>
          <div class="pokemon-info">
            <div class="pokemon-name-level">
              <span class="pokemon-name"></span>
              <span class="pokemon-level"></span>
            </div>
            <div class="hp-container">
              <div class="hp-bar">
                <div class="hp-fill"></div>
              </div>
              <div class="hp-text"></div>
            </div>
            <div class="pokemon-moves" id="player-moves"></div>
          </div>
        </div>
        
        <div class="battle-actions" id="battle-actions">
          <button class="battle-action-btn action-fight">Attaquer</button>
          <button class="battle-action-btn action-switch">Changer</button>
          <button class="battle-action-btn action-catch">Capturer</button>
          <button class="battle-action-btn action-run">Fuir</button>
        </div>
        
        <div class="battle-log" id="battle-log">
          <p>Le combat commence !</p>
        </div>
      </div>
    `;
    
    // Stocker les références aux éléments importants
    this.battlePreparation = document.getElementById('battle-preparation');
    this.battleArena = document.getElementById('battle-arena');
    this.teamSelectionContainer = document.getElementById('team-selection-container');
    this.teamSelection = document.getElementById('team-selection');
    this.teamPreview = document.getElementById('team-preview');
    this.confirmTeamButton = document.getElementById('confirm-team');
    
    this.opponentContainer = document.getElementById('opponent-container');
    this.playerContainer = document.getElementById('player-container');
    this.playerMoves = document.getElementById('player-moves');
    this.battleActions = document.getElementById('battle-actions');
    this.battleLog = document.getElementById('battle-log');
    
    // Attacher les écouteurs d'événements
    this.attachEventListeners();
  }
  
  // Attacher les écouteurs d'événements
  attachEventListeners() {
    // Écouteurs pour la sélection du mode de combat
    const battleModeCards = document.querySelectorAll('.battle-mode-card');
    battleModeCards.forEach(card => {
      card.addEventListener('click', () => {
        // Retirer la classe active de toutes les cartes
        battleModeCards.forEach(c => c.classList.remove('active'));
        
        // Ajouter la classe active à la carte sélectionnée
        card.classList.add('active');
        
        // Afficher la sélection d'équipe
        this.teamSelectionContainer.style.display = 'block';
        
        // Stocker le mode sélectionné
        this.selectedMode = card.dataset.mode;
        
        // Charger les Pokémon de la collection
        this.loadTeamSelection();
      });
    });
    
    // Écouteur pour le bouton de confirmation d'équipe
    this.confirmTeamButton.addEventListener('click', () => {
      if (this.onTeamConfirmedCallback) {
        const selectedPokemonIds = Array.from(document.querySelectorAll('.team-preview-pokemon'))
          .map(el => el.dataset.pokemonId);
        
        this.onTeamConfirmedCallback(selectedPokemonIds, this.selectedMode);
      }
    });
    
    // Écouteurs pour les actions de combat
    document.querySelector('.action-fight').addEventListener('click', () => {
      // Afficher les moves
      this.toggleMovesDisplay(true);
    });
    
    document.querySelector('.action-switch').addEventListener('click', () => {
      // Afficher la sélection de Pokémon
      this.showPokemonSwitchOptions();
    });
    
    document.querySelector('.action-catch').addEventListener('click', () => {
      if (this.onCatchAttemptCallback) {
        this.onCatchAttemptCallback();
      }
    });
    
    document.querySelector('.action-run').addEventListener('click', () => {
      if (this.onRunCallback) {
        this.onRunCallback();
      }
    });
  }
  
  // Charger les Pokémon de la collection pour la sélection d'équipe
  loadTeamSelection() {
    // Récupérer les Pokémon de la collection
    const pokemons = this.appStateModel.getPokemons();
    
    // Trier par niveau décroissant
    pokemons.sort((a, b) => (b.level || 1) - (a.level || 1));
    
    // Vider le conteneur de sélection
    this.teamSelection.innerHTML = '';
    
    // Ajouter chaque Pokémon
    pokemons.forEach(pokemon => {
      const pokemonElement = document.createElement('div');
      pokemonElement.className = 'team-selection-pokemon';
      pokemonElement.dataset.pokemonId = pokemon.uniqueId;
      
      // Déterminer les types pour le background
      const mainType = pokemon.types[0].type.name;
      
      pokemonElement.innerHTML = `
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        <div class="team-pokemon-info">
          <div class="team-pokemon-name">${this.capitalizeFirstLetter(pokemon.name)}</div>
          <div class="team-pokemon-level">Nv. ${pokemon.level || 1}</div>
          <div class="team-pokemon-types">
            ${pokemon.types.map(t => `<span class="pokemon-type ${t.type.name}">${this.capitalizeFirstLetter(t.type.name)}</span>`).join('')}
          </div>
        </div>
      `;
      
      // Ajouter l'écouteur d'événement pour la sélection
      pokemonElement.addEventListener('click', () => {
        this.togglePokemonSelection(pokemonElement);
      });
      
      this.teamSelection.appendChild(pokemonElement);
    });
  }
  
  // Gérer la sélection/désélection d'un Pokémon pour l'équipe
  togglePokemonSelection(pokemonElement) {
    const pokemonId = pokemonElement.dataset.pokemonId;
    
    // Vérifier si le Pokémon est déjà sélectionné
    const isSelected = pokemonElement.classList.contains('selected');
    
    if (isSelected) {
      // Désélectionner le Pokémon
      pokemonElement.classList.remove('selected');
      
      // Retirer de la prévisualisation d'équipe
      const previewElement = document.querySelector(`.team-preview-pokemon[data-pokemon-id="${pokemonId}"]`);
      if (previewElement) {
        previewElement.remove();
      }
    } else {
      // Vérifier si on a déjà atteint la limite de 6 Pokémon
      const selectedCount = document.querySelectorAll('.team-selection-pokemon.selected').length;
      if (selectedCount >= 6) {
        this.uiView.showNotification('Votre équipe est déjà complète ! (6 Pokémon maximum)');
        return;
      }
      
      // Sélectionner le Pokémon
      pokemonElement.classList.add('selected');
      
      // Ajouter à la prévisualisation d'équipe
      const previewElement = document.createElement('div');
      previewElement.className = 'team-preview-pokemon';
      previewElement.dataset.pokemonId = pokemonId;
      
      // Récupérer les données du Pokémon
      const pokemon = this.appStateModel.getPokemonById(pokemonId);
      
      previewElement.innerHTML = `
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        <span>${this.capitalizeFirstLetter(pokemon.name)}</span>
        <button class="remove-from-team" data-pokemon-id="${pokemonId}">×</button>
      `;
      
      // Ajouter l'écouteur pour retirer de l'équipe
      previewElement.querySelector('.remove-from-team').addEventListener('click', (event) => {
        event.stopPropagation();
        const id = event.target.dataset.pokemonId;
        
        // Désélectionner dans la liste principale
        const selectionElement = document.querySelector(`.team-selection-pokemon[data-pokemon-id="${id}"]`);
        if (selectionElement) {
          selectionElement.classList.remove('selected');
        }
        
        // Retirer de la prévisualisation
        previewElement.remove();
        
        // Mettre à jour l'état du bouton de confirmation
        this.updateConfirmButtonState();
      });
      
      this.teamPreview.appendChild(previewElement);
    }
    
    // Mettre à jour l'état du bouton de confirmation
    this.updateConfirmButtonState();
  }
  
  // Mettre à jour l'état du bouton de confirmation d'équipe
  updateConfirmButtonState() {
    const selectedCount = document.querySelectorAll('.team-preview-pokemon').length;
    this.confirmTeamButton.disabled = selectedCount < 3;
  }
  
  // Afficher l'arène de combat et masquer la préparation
  showBattleArena() {
    this.battlePreparation.style.display = 'none';
    this.battleArena.style.display = 'flex';
  }
  
  // Revenir à l'écran de préparation
  showBattlePreparation() {
    this.battleArena.style.display = 'none';
    this.battlePreparation.style.display = 'block';
  }
  
  // Afficher un Pokémon sur le terrain (joueur ou adversaire)
  displayPokemon(pokemon, isPlayer) {
    const container = isPlayer ? this.playerContainer : this.opponentContainer;
    
    // Mettre à jour le nom et le niveau
    container.querySelector('.pokemon-name').textContent = this.capitalizeFirstLetter(pokemon.name);
    container.querySelector('.pokemon-level').textContent = `Nv. ${pokemon.level}`;
    
    // Mettre à jour le sprite
    const spriteElement = container.querySelector('.pokemon-sprite');
    spriteElement.innerHTML = `<img src="${isPlayer ? pokemon.sprites.back_default : pokemon.sprites.front_default}" alt="${pokemon.name}">`;
    
    // Mettre à jour la barre de vie
    this.updateHealthBar(pokemon, isPlayer);
    
    // Si c'est le joueur, mettre à jour les moves
    if (isPlayer) {
      this.updateMoves(pokemon);
    }
  }
  
  // Mettre à jour la barre de vie
  updateHealthBar(pokemon, isPlayer) {
    const container = isPlayer ? this.playerContainer : this.opponentContainer;
    
    // Calculer le pourcentage de vie
    const healthPercent = (pokemon.current_hp / pokemon.stats.hp) * 100;
    
    // Mettre à jour la barre
    const hpFill = container.querySelector('.hp-fill');
    hpFill.style.width = `${healthPercent}%`;
    
    // Déterminer la couleur en fonction du pourcentage
    if (healthPercent > 50) {
      hpFill.style.backgroundColor = '#78C850'; // Vert
    } else if (healthPercent > 20) {
      hpFill.style.backgroundColor = '#F8D030'; // Jaune
    } else {
      hpFill.style.backgroundColor = '#F08030'; // Rouge
    }
    
    // Mettre à jour le texte
    container.querySelector('.hp-text').textContent = `${pokemon.current_hp} / ${pokemon.stats.hp}`;
  }
  
  // Mettre à jour les attaques du joueur
  updateMoves(pokemon) {
    this.playerMoves.innerHTML = '';
    
    pokemon.moves.forEach(move => {
      const moveButton = document.createElement('button');
      moveButton.className = `move-button ${move.type}`;
      
      moveButton.innerHTML = `
        <span class="move-name">${this.capitalizeFirstLetter(move.name.replace('-', ' '))}</span>
        <div class="move-details">
          <span class="move-type">${this.capitalizeFirstLetter(move.type)}</span>
          <span class="move-pp">${move.current_pp}/${move.pp}</span>
        </div>
      `;
      
      // Désactiver le bouton si plus de PP
      if (move.current_pp <= 0) {
        moveButton.disabled = true;
        moveButton.classList.add('disabled');
      }
      
      // Ajouter l'écouteur d'événement
      moveButton.addEventListener('click', () => {
        if (this.onMoveSelectedCallback) {
          this.onMoveSelectedCallback(move);
        }
      });
      
      this.playerMoves.appendChild(moveButton);
    });
  }
  
  // Afficher/masquer les attaques
  toggleMovesDisplay(show) {
    if (show) {
      this.playerMoves.style.display = 'grid';
      this.battleActions.style.display = 'none';
    } else {
      this.playerMoves.style.display = 'none';
      this.battleActions.style.display = 'grid';
    }
  }
  
  // Afficher les options de changement de Pokémon
  showPokemonSwitchOptions() {
    // Créer l'interface pour sélectionner un Pokémon
    const switchContainer = document.createElement('div');
    switchContainer.className = 'pokemon-switch-container';
    
    const headerText = document.createElement('h3');
    headerText.textContent = 'Choisissez un Pokémon';
    switchContainer.appendChild(headerText);
    
    const pokemonList = document.createElement('div');
    pokemonList.className = 'pokemon-switch-list';
    
    // Utiliser les données de combat stockées dans la vue
    if (!this.currentBattle || !this.currentBattle.playerTeam) {
      console.error("Données de combat manquantes dans la vue BattleView");
      
      const errorMessage = document.createElement('p');
      errorMessage.textContent = "Une erreur s'est produite. Impossible d'afficher les Pokémon disponibles.";
      errorMessage.style.color = "red";
      pokemonList.appendChild(errorMessage);
    } else {
      const playerTeam = this.currentBattle.playerTeam;
      const currentPokemonId = this.currentBattle.playerActivePokemon?.uniqueId;
      
      let hasAvailablePokemon = false;
      
      playerTeam.forEach(pokemon => {
        // Ne pas afficher le Pokémon actuellement actif ou les Pokémon K.O.
        if (pokemon.current_hp <= 0 || (currentPokemonId && pokemon.uniqueId === currentPokemonId)) {
          return;
        }
        
        hasAvailablePokemon = true;
        
        const pokemonOption = document.createElement('div');
        pokemonOption.className = 'pokemon-switch-option';
        pokemonOption.dataset.pokemonId = pokemon.uniqueId;
        
        pokemonOption.innerHTML = `
          <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
          <div class="switch-pokemon-info">
            <div class="switch-pokemon-name">${this.capitalizeFirstLetter(pokemon.name)}</div>
            <div class="switch-pokemon-level">Nv. ${pokemon.level || 1}</div>
            <div class="switch-pokemon-hp">PV: ${pokemon.current_hp}/${pokemon.stats.hp}</div>
            <div class="switch-pokemon-types">
              ${pokemon.types.map(type => `<span class="pokemon-type ${type}">${this.capitalizeFirstLetter(type)}</span>`).join('')}
            </div>
          </div>
        `;
        
        // Ajouter l'écouteur d'événement pour la sélection
        pokemonOption.addEventListener('click', () => {
          if (this.onPokemonSelectedCallback) {
            this.onPokemonSelectedCallback(pokemon.uniqueId);
            switchContainer.remove(); // Fermer le menu après la sélection
          }
        });
        
        pokemonList.appendChild(pokemonOption);
      });
      
      if (!hasAvailablePokemon) {
        const noPokemons = document.createElement('p');
        noPokemons.textContent = 'Aucun Pokémon disponible pour le changement';
        pokemonList.appendChild(noPokemons);
      }
    }
    
    switchContainer.appendChild(pokemonList);
    
    // Ajouter un bouton pour annuler (seulement si ce n'est pas un changement forcé)
    if (!this.forcedSwitch) {
      const cancelButton = document.createElement('button');
      cancelButton.className = 'action-button';
      cancelButton.textContent = 'Annuler';
      cancelButton.addEventListener('click', () => {
        switchContainer.remove();
      });
      
      switchContainer.appendChild(cancelButton);
    }
    
    // Ajouter le conteneur à l'arène de combat
    this.battleArena.appendChild(switchContainer);
  }
  
  // Afficher l'animation de capture
  showCaptureAnimation(success) {
    // Créer le conteneur d'animation
    const animationContainer = document.createElement('div');
    animationContainer.className = 'capture-animation';
    
    // Ajouter l'image de la Pokéball
    const pokeballImg = document.createElement('img');
    pokeballImg.src = 'images/pokeball-capture.svg';
    pokeballImg.className = 'pokeball-capture';
    animationContainer.appendChild(pokeballImg);
    
    // Ajouter le conteneur à l'arène
    this.battleArena.appendChild(animationContainer);
    
    // Animer la capture
    setTimeout(() => {
      // Masquer le sprite du Pokémon adverse si la capture réussit
      if (success) {
        const opponentSprite = this.opponentContainer.querySelector('.pokemon-sprite img');
        if (opponentSprite) {
          opponentSprite.style.display = 'none';
        }
        
        // Ajouter une animation de succès à la Pokéball (oscillation puis arrêt)
        pokeballImg.classList.add('capture-success');
      } else {
        // Ajouter une animation d'échec (la Pokéball s'ouvre et le Pokémon ressort)
        pokeballImg.classList.add('capture-fail');
        
        // Rendre à nouveau visible le sprite adverse après l'animation
        setTimeout(() => {
          const opponentSprite = this.opponentContainer.querySelector('.pokemon-sprite img');
          if (opponentSprite) {
            opponentSprite.style.display = 'block';
          }
        }, 1000);
      }
      
      // Nettoyer l'animation après un délai
      setTimeout(() => {
        animationContainer.remove();
      }, success ? 2000 : 1500);
    }, 1500); // Attendre que la Pokéball "atteigne" le Pokémon
  }
  
  // Ajouter un message au log de combat
  addBattleLog(message) {
    const logEntry = document.createElement('p');
    logEntry.innerHTML = message;
    this.battleLog.appendChild(logEntry);
    
    // Défiler vers le bas
    this.battleLog.scrollTop = this.battleLog.scrollHeight;
  }
  
  // Afficher l'animation d'attaque
  showAttackAnimation(isPlayer, effectiveness) {
    const targetContainer = isPlayer ? this.opponentContainer : this.playerContainer;
    const sprite = targetContainer.querySelector('.pokemon-sprite img');
    
    // Classe d'animation en fonction de l'efficacité
    let animationClass = 'attack-normal';
    if (effectiveness > 1.5) {
      animationClass = 'attack-super-effective';
    } else if (effectiveness < 0.5) {
      animationClass = 'attack-not-effective';
    } else if (effectiveness === 0) {
      animationClass = 'attack-no-effect';
    }
    
    // Ajouter et retirer la classe pour déclencher l'animation
    sprite.classList.add(animationClass);
    setTimeout(() => {
      sprite.classList.remove(animationClass);
    }, 1000);
  }
  
  // Méthode utilitaire pour capitaliser la première lettre
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  // Setters pour les callbacks
  setOnMoveSelectedCallback(callback) {
    this.onMoveSelectedCallback = callback;
  }
  
  setOnPokemonSelectedCallback(callback) {
    this.onPokemonSelectedCallback = callback;
  }
  
  setOnCatchAttemptCallback(callback) {
    this.onCatchAttemptCallback = callback;
  }
  
  setOnRunCallback(callback) {
    this.onRunCallback = callback;
  }
  
  setOnTeamConfirmedCallback(callback) {
    this.onTeamConfirmedCallback = callback;
  }
} 