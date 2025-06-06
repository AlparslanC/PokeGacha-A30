// models/EggModel.js - Modèle pour la gestion des œufs
class EggModel {
    constructor() {
      this.MIN_HATCH_TIME = 600000; // 10 minutes en millisecondes
      this.MAX_HATCH_TIME = 1800000; // 30 minutes en millisecondes
      this.SHAKE_BONUS = 10; // Bonus de progression pour le secouement
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
      const hatchTime = egg.hatchTime || this.MAX_HATCH_TIME; // Utiliser le temps spécifique de l'œuf ou le maximum par défaut

      console.log("Time values:", {
        now,
        createdAt: egg.createdAt,
        timePassed,
        hatchTime: hatchTime
      });
  
      let progress = (timePassed / hatchTime) * 100;
  
      // Ajouter le bonus de secouement si applicable
      if (egg.lastShake) {
        const shakeBonus = ((now - egg.lastShake) / hatchTime) * this.SHAKE_BONUS;
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
          hatchTime: hatchTime,
          initialProgress: (timePassed / hatchTime) * 100
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