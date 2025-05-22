// models/AppStateModel.js - Modèle principal de l'état de l'application
class AppStateModel {
    constructor() {
      this.data = {
        pokemons: [],
        eggs: [],
        photos: [],
        userPokeballs: 10,
        cameraStream: null,
        selectedPokemonForPhoto: null,
      };
      this.observers = [];
    }
  
    // Pattern Observer pour notifier les changements
    addObserver(observer) {
      this.observers.push(observer);
    }
  
    removeObserver(observer) {
      this.observers = this.observers.filter(obs => obs !== observer);
    }
  
    notifyObservers(changeType, data) {
      this.observers.forEach(observer => observer.update(changeType, data));
    }
  
    // Getters
    getPokemons() { return [...this.data.pokemons]; }
    getEggs() { return [...this.data.eggs]; }
    getPhotos() { return [...this.data.photos]; }
    getUserPokeballs() { return this.data.userPokeballs; }
    getCameraStream() { return this.data.cameraStream; }
    getSelectedPokemonForPhoto() { return this.data.selectedPokemonForPhoto; }
  
    // Setters avec notification
    addPokemon(pokemon) {
      this.data.pokemons.push(pokemon);
      this.notifyObservers('POKEMON_ADDED', pokemon);
    }
  
    addEgg(egg) {
      this.data.eggs.push(egg);
      this.notifyObservers('EGG_ADDED', egg);
    }
  
    removeEgg(index) {
      const egg = this.data.eggs.splice(index, 1)[0];
      this.notifyObservers('EGG_REMOVED', { egg, index });
    }
  
    updateEgg(index, egg) {
      this.data.eggs[index] = { ...this.data.eggs[index], ...egg };
      this.notifyObservers('EGG_UPDATED', { egg: this.data.eggs[index], index });
    }
  
    addPhoto(photo) {
      this.data.photos.push(photo);
      this.notifyObservers('PHOTO_ADDED', photo);
    }
  
    setUserPokeballs(count) {
      this.data.userPokeballs = count;
      this.notifyObservers('POKEBALLS_UPDATED', count);
    }
  
    decrementPokeballs() {
      if (this.data.userPokeballs > 0) {
        this.data.userPokeballs--;
        this.notifyObservers('POKEBALLS_UPDATED', this.data.userPokeballs);
      }
    }
  
    incrementPokeballs() {
      this.data.userPokeballs++;
      this.notifyObservers('POKEBALLS_UPDATED', this.data.userPokeballs);
    }
  
    setCameraStream(stream) {
      this.data.cameraStream = stream;
      this.notifyObservers('CAMERA_STREAM_UPDATED', stream);
    }
  
    setSelectedPokemonForPhoto(pokemon) {
      this.data.selectedPokemonForPhoto = pokemon;
      this.notifyObservers('SELECTED_POKEMON_UPDATED', pokemon);
    }
  
    // Méthodes pour la persistance
    hydrate(data) {
      this.data = { ...this.data, ...data };
      this.notifyObservers('STATE_HYDRATED', this.data);
    }
  
    serialize() {
      return {
        pokemons: this.data.pokemons,
        eggs: this.data.eggs,
        photos: this.data.photos,
        userPokeballs: this.data.userPokeballs
      };
    }
  }