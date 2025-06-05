// presenters/GameLogicPresenter.js - Logique de jeu
class GameLogicPresenter {
  constructor(appStateModel, pokemonModel, eggModel, uiView) {
    this.appStateModel = appStateModel;
    this.pokemonModel = pokemonModel;
    this.eggModel = eggModel;
    this.uiView = uiView;
    this.lastShakeTime = 0;
    this.shakeThreshold = 10; // Seuil ajusté pour une meilleure détection
    this.shakeCooldown = 1000; // 1 seconde entre chaque secouement
    this.activeEggIndex = null;
    this.lastAcceleration = { x: 0, y: 0, z: 0 };
    this.mainPresenter = null; // Sera défini par setMainPresenter
    
    // Charger les cooldowns au démarrage
    this.loadBreedingCooldowns();
  }

  setMainPresenter(mainPresenter) {
    this.mainPresenter = mainPresenter;
  }

  loadBreedingCooldowns() {
    try {
      const savedCooldowns = localStorage.getItem('breedingCooldowns');
      if (savedCooldowns) {
        const cooldowns = JSON.parse(savedCooldowns);
        // Nettoyer les cooldowns expirés
        const now = Date.now();
        const validCooldowns = {};
        for (const [pokemonId, endTime] of Object.entries(cooldowns)) {
          if (endTime > now) {
            validCooldowns[pokemonId] = endTime;
          }
        }
        // Mettre à jour le localStorage avec les cooldowns valides
        localStorage.setItem('breedingCooldowns', JSON.stringify(validCooldowns));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des cooldowns:', error);
      localStorage.removeItem('breedingCooldowns');
    }
  }

  saveBreedingCooldowns(cooldowns) {
    try {
      localStorage.setItem('breedingCooldowns', JSON.stringify(cooldowns));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des cooldowns:', error);
    }
  }

  updateBreedingCooldown(pokemonId, duration = 300000) { // 5 minutes en millisecondes
    this.appStateModel.startBreedingCooldown(pokemonId);
  }

  async openPokeball() {
    if (this.appStateModel.getUserPokeballs() <= 0) {
      this.uiView.showNotification("Vous n'avez plus de Pokéball !");
      return;
    }

    this.appStateModel.decrementPokeballs();
    this.uiView.animatePokeball();
    this.uiView.showLoader();

    // Déterminer si on obtient un Pokémon ou un œuf (70% Pokémon, 30% œuf)
    const isPokemon = Math.random() < 0.7;

    try {
      if (isPokemon) {
        const pokemon = await this.pokemonModel.fetchRandomPokemon();
        // Attendre que l'ajout soit terminé
        await new Promise(resolve => {
          this.appStateModel.addPokemon(pokemon);
          // Forcer une petite attente pour s'assurer que l'état est mis à jour
          setTimeout(resolve, 100);
        });
        
        this.uiView.hideLoader();
        this.uiView.showRewardModal(
          pokemon.isShiny ? "Pokémon Chromatique trouvé !" : "Pokémon capturé !",
          pokemon.sprites.front_default,
          pokemon.isShiny 
            ? `Incroyable ! Vous avez trouvé un ${this.capitalizeFirstLetter(pokemon.name)} Chromatique !`
            : `Vous avez capturé un ${this.capitalizeFirstLetter(pokemon.name)} !`
        );
      } else {
        // Créer un œuf
        setTimeout(() => {
          const newEgg = this.eggModel.createEgg();
          this.appStateModel.addEgg(newEgg);
          this.uiView.hideLoader();
          this.uiView.showRewardModal(
            "Œuf trouvé !",
            "images/egg.png",
            "Vous avez trouvé un œuf ! Incubez-le pour le faire éclore."
          );
        }, 1000);
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la Pokéball:", error);
      this.uiView.hideLoader();
      this.uiView.showNotification("Erreur lors de la capture.");
    }
  }

  incubateEgg(index) {
    const eggs = this.appStateModel.getEggs();
    const egg = eggs[index];

    if (egg) {
      const updatedEgg = this.eggModel.incubateEgg({ ...egg });
      this.appStateModel.updateEgg(index, updatedEgg);
      this.uiView.showNotification("Vous avez réchauffé l'œuf !");
    }
  }

  async hatchEgg(index) {
    const eggs = this.appStateModel.getEggs();
    const egg = eggs[index];

    if (!egg) {
      console.error("Egg not found at index:", index);
      return;
    }

    try {
      let pokemon;
      if (egg.isBreedingEgg && egg.parentPokemon) {
        // Pour un œuf d'accouplement, on récupère les données du Pokémon parent
        pokemon = await this.pokemonModel.fetchPokemonById(egg.parentPokemon.id);
        pokemon.uniqueId = `${pokemon.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        pokemon.isShiny = Math.random() < 1/4096; // Taux officiel de shiny (1/4096)
      } else {
        // Pour un œuf normal, on obtient un Pokémon aléatoire
        pokemon = await this.pokemonModel.fetchRandomPokemon();
      }

      this.appStateModel.addPokemon(pokemon);
      this.appStateModel.removeEgg(index);
      
      const message = egg.isBreedingEgg 
        ? `Un ${this.capitalizeFirstLetter(pokemon.name)} est né de l'œuf d'accouplement !`
        : `Un ${this.capitalizeFirstLetter(pokemon.name)} est né !`;

      this.uiView.showRewardModal(
        pokemon.isShiny ? "Œuf éclos - Pokémon Chromatique !" : "Œuf éclos !",
        pokemon.isShiny ? pokemon.sprites.front_shiny : pokemon.sprites.front_default,
        pokemon.isShiny 
          ? `Incroyable ! ${message} Et il est Chromatique !`
          : message
      );

      // Rafraîchir les collections après l'éclosion
      if (this.mainPresenter) {
        this.mainPresenter.refreshCollections();
      }

    } catch (error) {
      console.error("Erreur lors de l'éclosion:", error);
      this.uiView.showNotification("Erreur lors de l'éclosion de l'œuf.");
    }
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  handleDeviceMotion(event) {
    const currentTime = new Date().getTime();
    if (currentTime - this.lastShakeTime < this.shakeCooldown) {
      return;
    }

    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    // Calculer la différence d'accélération
    const deltaX = Math.abs(acceleration.x - this.lastAcceleration.x);
    const deltaY = Math.abs(acceleration.y - this.lastAcceleration.y);
    const deltaZ = Math.abs(acceleration.z - this.lastAcceleration.z);

    // Mettre à jour les dernières valeurs d'accélération
    this.lastAcceleration = {
      x: acceleration.x,
      y: acceleration.y,
      z: acceleration.z
    };

    // Calculer l'accélération totale
    const totalAcceleration = Math.sqrt(
      Math.pow(deltaX, 2) +
      Math.pow(deltaY, 2) +
      Math.pow(deltaZ, 2)
    );

    // Détecter le secouement
    if (totalAcceleration > this.shakeThreshold) {
      this.lastShakeTime = currentTime;
      
      if (this.activeEggIndex !== null) {
        const eggs = this.appStateModel.getEggs();
        const egg = eggs[this.activeEggIndex];
        if (!egg) {
          // Si l'œuf n'existe plus, désactiver le mode secouement
          this.activeEggIndex = null;
          return;
        }
        
        const progress = this.eggModel.calculateProgress(egg);

        if (!progress.isReady) {
          this.incubateEgg(this.activeEggIndex);
          this.uiView.showNotification("Œuf réchauffé !");
          
          // Vérifier si l'œuf est maintenant à 100%
          const newProgress = this.eggModel.calculateProgress(egg);
          if (newProgress.isReady) {
            this.uiView.showNotification("Œuf prêt à éclore !");
          }
        }
      }
    }
  }

  startShakeDetection() {
    if (window.DeviceMotionEvent) {
      // Désactiver d'abord toute détection existante
      this.stopShakeDetection();
      
      // Demander la permission pour l'accès aux capteurs sur iOS
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              const boundHandler = this.handleDeviceMotion.bind(this);
              window.addEventListener('devicemotion', boundHandler);
              this.boundHandler = boundHandler; // Stocker la référence pour pouvoir la supprimer plus tard
            } else {
              this.uiView.showNotification("L'accès aux capteurs de mouvement est nécessaire pour cette fonctionnalité.");
            }
          })
          .catch(console.error);
      } else {
        // Pour les autres appareils
        const boundHandler = this.handleDeviceMotion.bind(this);
        window.addEventListener('devicemotion', boundHandler);
        this.boundHandler = boundHandler; // Stocker la référence pour pouvoir la supprimer plus tard
      }
    } else {
      this.uiView.showNotification("Votre appareil ne supporte pas la détection du secouement.");
    }
  }

  stopShakeDetection() {
    if (window.DeviceMotionEvent && this.boundHandler) {
      window.removeEventListener('devicemotion', this.boundHandler);
      this.boundHandler = null;
    }
  }

  toggleShakeMode(index) {
    if (this.activeEggIndex === index) {
      // Désactiver le mode secouement pour cet œuf
      this.activeEggIndex = null;
      this.uiView.showNotification("Mode secouement désactivé");
      return false;
    } else {
      // Vérifier si l'œuf n'est pas déjà à 100%
      const eggs = this.appStateModel.getEggs();
      const egg = eggs[index];
      const progress = this.eggModel.calculateProgress(egg);

      if (progress.isReady) {
        this.uiView.showNotification("Cet œuf est déjà prêt à éclore !");
        return false;
      }

      // Activer le mode secouement pour cet œuf
      this.activeEggIndex = index;
      this.uiView.showNotification("Mode secouement activé ! Secouez votre téléphone pour réchauffer cet œuf.");
      return true;
    }
  }
}
