// views/PokemonCollectionView.js - Vue pour la collection de Pokémon
class PokemonCollectionView extends BaseView {
  constructor(container) {
    super(container);
    this.onPokemonClick = null;
  }

  render(pokemons) {
    this.clearContainer();

    if (pokemons.length === 0) {
      this.container.innerHTML =
        "<p class='text-center'>Aucun Pokémon capturé pour l'instant.</p>";
      return;
    }

    pokemons.forEach((pokemon) => {
      const pokemonCard = this.createPokemonCard(pokemon);
      this.container.appendChild(pokemonCard);
    });
  }

  createPokemonCard(pokemon) {
    const card = this.createElement("div", "pokemon-card");
    card.dataset.id = pokemon.id;

    // Badges de type
    const typeContainer = this.createElement("div", "pokemon-types");
    pokemon.allTypes.forEach((type) => {
      const typeBadge = this.createElement(
        "span",
        `pokemon-type ${type}`,
        type
      );
      typeContainer.appendChild(typeBadge);
    });
    card.appendChild(typeContainer);

    // Image
    const image = this.createElement("img", "pokemon-image");
    image.src = pokemon.sprites.front_default;
    image.alt = pokemon.name;

    // Nom
    const name = this.createElement(
      "p",
      "pokemon-name",
      this.capitalizeFirstLetter(pokemon.name)
    );

    card.appendChild(image);
    card.appendChild(name);

    // Événement de clic
    this.bindEvent(card, "click", () => {
      if (this.onPokemonClick) {
        this.onPokemonClick(pokemon);
      }
    });

    return card;
  }

  setOnPokemonClick(callback) {
    this.onPokemonClick = callback;
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
