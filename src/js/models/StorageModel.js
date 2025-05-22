// models/StorageModel.js - Modèle pour la persistance
class StorageModel {
    constructor() {
      this.storageKey = 'pokemon-app-data';
    }
  
    save(data) {
      try {
        const serializedData = {
          pokemons: data.pokemons || [],
          eggs: data.eggs || [],
          photos: data.photos || [],
          userPokeballs: data.userPokeballs || 10,
          timestamp: Date.now()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(serializedData));
        return true;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        return false;
      }
    }
  
    load() {
      try {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          return {
            pokemons: parsedData.pokemons || [],
            eggs: parsedData.eggs || [],
            photos: parsedData.photos || [],
            userPokeballs: parsedData.userPokeballs || 10
          };
        }
        return null;
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        return null;
      }
    }
  
    clear() {
      try {
        localStorage.removeItem(this.storageKey);
        return true;
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        return false;
      }
    }
  }