// models/EggModel.js - Modèle pour la gestion des œufs
class EggModel {
    constructor() {
      this.HATCH_TIME = 60000; // 60 secondes pour l'éclosion
      this.SHAKE_BONUS = 10; // Bonus de progression pour le secouement
    }
  
    createEgg(parentPokemon = null) {
      const now = Date.now();
      console.log("Creating new egg at:", now);
      return {
        createdAt: now,
        lastShake: now,
        progress: 0,
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
  
      if (!egg.createdAt) {
        console.warn("Egg has no createdAt timestamp:", egg);
        return { progress: 0, isReady: false };
      }
  
      const now = Date.now();
      const timePassed = now - egg.createdAt;

      console.log("Time values:", {
        now,
        createdAt: egg.createdAt,
        timePassed,
        HATCH_TIME: this.HATCH_TIME
      });
  
      let progress = (timePassed / this.HATCH_TIME) * 100;
  
      // Ajouter le bonus de secouement si applicable
      if (egg.lastShake) {
        const shakeBonus = ((now - egg.lastShake) / this.HATCH_TIME) * this.SHAKE_BONUS;
        console.log("Shake bonus:", {
          lastShake: egg.lastShake,
          shakeBonus,
          newProgress: progress + shakeBonus
        });
        progress += shakeBonus;
      }
  
      // Limiter la progression à 100%
      progress = Math.min(progress, 100);
      
      // S'assurer que la progression n'est pas NaN
      if (isNaN(progress)) {
        console.error("Progress calculation resulted in NaN:", {
          timePassed,
          HATCH_TIME: this.HATCH_TIME,
          initialProgress: (timePassed / this.HATCH_TIME) * 100
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
      return {
        ...egg,
        lastShake: now
      };
    }
  
    formatTime(ms) {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / 1000 / 60) % 60);
      const hours = Math.floor(ms / 1000 / 60 / 60);
      return `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`;
    }
  }