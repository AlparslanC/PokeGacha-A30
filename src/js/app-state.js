// app-state.js - Gère l'état global de l'application

// État de l'application
window.appState = {
  pokemons: [],
  eggs: [],
  photos: [],
  userPokeballs: 10,
  cameraStream: null,
  selectedPokemonForPhoto: null,
};

// Exposer l'état aux autres modules
export default window.appState;
