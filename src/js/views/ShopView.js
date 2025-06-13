// views/ShopView.js
class ShopView extends BaseView {
  constructor(container) {
    super(container);
    this.onBuyPokeball = null;
    this.onBuyShiny = null;
  }

  render(candyCount) {
    this.clear();

    const shopContainer = this.createElement("div", "shop-container");

    // Titre
    const title = this.createElement("h2", "shop-title", "Boutique de Bonbons");
    shopContainer.appendChild(title);

    // Solde actuel
    const balance = this.createElement("div", "shop-balance");
    balance.innerHTML = `
      <img src="images/super-bonbon.png" alt="Super Bonbon" class="shop-icon">
      <span>Solde : ${candyCount} bonbons</span>
    `;
    shopContainer.appendChild(balance);

    // Articles
    const itemsContainer = this.createElement("div", "shop-items");

    // Pokéball
    const pokeballItem = this.createElement("div", "shop-item");
    pokeballItem.innerHTML = `
      <img src="images/pokeball.png" alt="Pokéball" class="shop-item-image">
      <h3>Pokéball</h3>
      <p class="shop-item-price">
        <img src="images/super-bonbon.png" alt="Super Bonbon" class="shop-icon-small">
        10 bonbons
      </p>
    `;
    const buyPokeballBtn = this.createElement("button", "shop-buy-btn", "Acheter");
    this.bindEvent(buyPokeballBtn, "click", () => {
      if (this.onBuyPokeball) this.onBuyPokeball();
    });
    pokeballItem.appendChild(buyPokeballBtn);
    itemsContainer.appendChild(pokeballItem);

    // Pokémon Shiny
    const shinyItem = this.createElement("div", "shop-item");
    shinyItem.innerHTML = `
      <div class="shop-item-image shiny-placeholder">?</div>
      <h3>Pokémon Shiny Aléatoire</h3>
      <p class="shop-item-price">
        <img src="images/super-bonbon.png" alt="Super Bonbon" class="shop-icon-small">
        1 000 bonbons
      </p>
    `;
    const buyShinyBtn = this.createElement("button", "shop-buy-btn", "Acheter");
    this.bindEvent(buyShinyBtn, "click", () => {
      if (this.onBuyShiny) this.onBuyShiny();
    });
    shinyItem.appendChild(buyShinyBtn);
    itemsContainer.appendChild(shinyItem);

    shopContainer.appendChild(itemsContainer);
    this.container.appendChild(shopContainer);
  }

  setOnBuyPokeball(callback) {
    this.onBuyPokeball = callback;
  }

  setOnBuyShiny(callback) {
    this.onBuyShiny = callback;
  }
} 