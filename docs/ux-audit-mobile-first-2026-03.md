# UX Audit Mobile-First - Mars 2026

Ce document fixe les conventions UX/UI appliquees apres rework, pour eviter les regressions.

## Catalogue (site public)

- Filtres mobile dans un drawer dedie (`CatalogFilterDrawer`) avec logique `draft -> appliquer`.
- Facettes prioritaires : `type` puis `marque` (patterns e-commerce parfum dominants).
- Libelles simplifies et familiers :
  - `Niche`
  - `Marque`
  - `Artisan` (reserve evolutions futures)
- URL sync des filtres :
  - `brands=dior,chanel`
  - `type=niche,designer`

## Contact

- Priorite mobile : cibles tactiles >= 44px, labels visibles (pas de floating labels).
- Ordre de friction faible :
  1. Canaux directs (WhatsApp / Snapchat)
  2. Formulaire
- CTA primaire unique et explicite : `Envoyer`.
- Champs avec hauteur confortable et messages d'erreur courts.

## Admin

- Actions metier explicites :
  - `Visible` / `Masque` (toggle oeil)
  - `Supprimer` (hard delete avec confirmation)
- Plus de wording ambigu (`restaurer`, `suppression douce`, etc.).
- Vocabulaire metier simplifie pour profils non formes.

## Garde-fous qualite

- Toujours verifier `tsc --noEmit` et `eslint`.
- Tester en premier sur mobile (390px), puis tablette, puis desktop.
- Garder les labels orientes utilisateur, eviter le jargon interne.
