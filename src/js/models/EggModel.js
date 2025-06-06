// models/EggModel.js - Modèle pour la gestion des œufs
class EggModel {
    constructor() {
      this.MIN_HATCH_TIME = 600000; // 10 minutes en millisecondes
      this.MAX_HATCH_TIME = 1800000; // 30 minutes en millisecondes
      this.SHAKE_REDUCTION = 60000; // Chaque secouement réduit de 60 secondes le temps d'éclosion
    }
  
    createEgg(parentPokemon = null) {
      const now = Date.now();
      // Générer un temps d'éclosion aléatoire entre MIN et MAX
      const hatchTime = Math.floor(
        Math.random() * (this.MAX_HATCH_TIME - this.MIN_HATCH_TIME + 1) + this.MIN_HATCH_TIME
      );
      console.log("Creating new egg at:", now, "with hatch time:", hatchTime);
      return {
        createdAt: now,
        lastShake: now,
        progress: 0,
        hatchTime: hatchTime,
        currentHatchTime: hatchTime, // Nouveau: temps d'éclosion actuel qui sera réduit
        isBreedingEgg: parentPokemon !== null,
        parentPokemon: parentPokemon
      };
    }
  
    calculateProgress(egg) {
      if (!egg) {
        console.warn("Trying to calculate progress for undefined egg");
        return { progress: 0, isReady: false };
      }

      console.log("Calculating progress for egg:", egg);
  
      if (!egg.createdAt || !egg.hatchTime) {
        console.warn("Egg has no createdAt timestamp or hatchTime:", egg);
        return { progress: 0, isReady: false };
      }
  
      const now = Date.now();
      const timePassed = now - egg.createdAt;
      const currentHatchTime = egg.currentHatchTime || egg.hatchTime;

      console.log("Time values:", {
        now,
        createdAt: egg.createdAt,
        timePassed,
        currentHatchTime: currentHatchTime
      });
  
      // Calculer la progression basée sur le temps d'éclosion actuel
      let progress = (timePassed / currentHatchTime) * 100;
      
      // Limiter la progression à 100%
      progress = Math.min(progress, 100);
      
      // S'assurer que la progression n'est pas NaN
      if (isNaN(progress)) {
        console.error("Progress calculation resulted in NaN:", {
          timePassed,
          currentHatchTime: currentHatchTime,
          initialProgress: (timePassed / currentHatchTime) * 100
        });
        progress = 0;
      }
  
      console.log("Final progress calculation:", {
        timePassed,
        progress,
        isReady: progress >= 100
      });
  
      return {
        progress,
        isReady: progress >= 100
      };
    }
  
    incubateEgg(egg) {
      const now = Date.now();
      // Réduire le temps d'éclosion actuel
      const newHatchTime = Math.max(
        egg.currentHatchTime - this.SHAKE_REDUCTION, 
        this.MIN_HATCH_TIME / 2
      ); // Ne pas descendre en dessous de 5 minutes
      
      return {
        ...egg,
        lastShake: now,
        currentHatchTime: newHatchTime
      };
    }
  
    formatTime(ms) {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / 1000 / 60) % 60);
      const hours = Math.floor(ms / 1000 / 60 / 60);
      return `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`;
    }
  }