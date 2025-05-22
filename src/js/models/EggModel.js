// models/EggModel.js - Modèle pour la gestion des œufs
class EggModel {
    constructor() {
      this.baseHatchTime = 30000; // 30 secondes pour les tests
      this.maxHatchTime = 120000; // 2 minutes max
    }
  
    createEgg() {
      return {
        id: Date.now(),
        startTime: Date.now(),
        hatchTime: this.baseHatchTime + Math.random() * (this.maxHatchTime - this.baseHatchTime),
        hatched: false,
      };
    }
  
    calculateProgress(egg) {
      const now = Date.now();
      const timeElapsed = now - egg.startTime;
      const progress = Math.min(100, (timeElapsed / egg.hatchTime) * 100);
      
      return {
        progress,
        timeElapsed,
        isReady: progress >= 100,
        timeElapsedFormatted: this.formatTime(timeElapsed),
        timeTotalFormatted: this.formatTime(egg.hatchTime),
      };
    }
  
    incubateEgg(egg) {
      const remaining = egg.hatchTime - (Date.now() - egg.startTime);
      if (remaining > 0) {
        egg.hatchTime -= Math.min(remaining, 5000); // Réduire de 5 secondes max
      }
      return egg;
    }
  
    formatTime(ms) {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / 1000 / 60) % 60);
      const hours = Math.floor(ms / 1000 / 60 / 60);
      return `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`;
    }
  }