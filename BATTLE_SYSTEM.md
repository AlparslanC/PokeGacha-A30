# Système de Combat Pokémon pour PokéGacha

Ce système de combat a été conçu pour s'intégrer parfaitement à l'application PokéGacha existante. Il permet aux joueurs d'utiliser leurs Pokémon collectionnés dans des combats stratégiques.

## Fonctionnalités

### Onglet "Arène"
- Accès via un 6ème onglet dans l'interface principale
- Trois modes de combat : Pokémon Sauvage, Dresseur, et Défi Quotidien
- Interface de sélection d'équipe (3-6 Pokémon)

### Modes de Combat
- **Pokémon Sauvage**: Affrontez un Pokémon sauvage aléatoire avec possibilité de le capturer
- **Dresseur**: Combattez une équipe de 3 Pokémon contrôlée par l'IA
- **Défi Quotidien**: Un combat plus difficile avec des récompenses améliorées (disponible une fois par jour)

### Système de Combat
- Combat au tour par tour basé sur la vitesse des Pokémon
- 4 actions possibles : Attaquer, Changer de Pokémon, Capturer (uniquement en mode sauvage), Fuir
- Attaques avec PP limités
- Calcul de dégâts prenant en compte les types, l'efficacité, et les stats

### Récompenses
- XP pour les Pokémon (montée de niveau)
- Bonbons (utilisables pour améliorer vos Pokémon)
- Pièces (monnaie du jeu)
- Capture de nouveaux Pokémon (en mode sauvage)

## Architecture Technique

### Modèles
- `BattleModel.js`: Gère les données et la logique de combat
  - Préparation des Pokémon pour le combat
  - Calcul des dégâts et de l'efficacité des types
  - Gestion de l'IA pour les adversaires

### Vues
- `BattleView.js`: Gère l'interface utilisateur du combat
  - Affichage des Pokémon et de leurs statistiques
  - Interface de sélection d'équipe
  - Animations d'attaque et de capture
  - Log de combat

### Présentateurs
- `BattlePresenter.js`: Fait le lien entre le modèle et la vue
  - Gestion du flux de combat
  - Traitement des actions utilisateur
  - Application des récompenses

### CSS
- `battle.css`: Styles spécifiques au système de combat

## Utilisation des données PokéAPI

Le système utilise l'API PokéAPI pour récupérer :
- Les capacités (moves) des Pokémon
- Les relations d'efficacité entre les types
- Les sprites et données de base pour les Pokémon adverses

## Optimisations

- **Cache intelligent** : Les données des types et les movesets sont mis en cache dans localStorage
- **Batch loading** : Chargement optimisé des données pour limiter les appels API
- **Preloading** : Préchargement des sprites pour une expérience fluide

## Ressources

- **Icônes et sprites** : Les icônes des modes de combat se trouvent dans le dossier `images/`
- **API** : [PokéAPI](https://pokeapi.co/api/v2/) pour les données authentiques

## Extension Future

Le système a été conçu de manière modulaire pour permettre d'ajouter facilement :
- De nouveaux modes de combat
- Des tournois
- Des capacités spéciales
- Des objets à utiliser pendant le combat 