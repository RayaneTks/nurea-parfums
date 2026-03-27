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
- **Pattern "Dual-Image" (Pattern Pro)** :
  - Si un parfum possède une image Claire & Sombre, n'afficher qu'une seule vignette.
  - Utiliser un badge `SunMoon` interactif pour basculer.
  - Gain de place sur mobile : libere l'espace pour le titre et les actions tout en signalant la richesse du catalogue.

## Méthodologie & Réflexion (Auto-amélioration)

1. **Progressive Disclosure** : Prioriser l'action principale sur mobile. Les détails secondaires (ex: voir la variante d'image) doivent être accessibles via une micro-interaction (Tap/Toggle) plutôt que d'encombrer le layout initial.
2. **Affordance Tactile** : Chaque zone interactive doit fournir un feedback visuel (`active:scale-95`) immédiat pour compenser l'absence de survol (hover) sur mobile.
3. **Safe Zones & Notches** : Toujours anticiper l'affichage "standalone" (PWA) sur iOS en utilisant `env(safe-area-inset-top)` et `bottom`.
4. **Z-Index Strategy** : Les modales d'action doivent systématiquement être des "Bottom Drawers" (ancrées en bas) pour être à portée de pouce (Thumb-zone optimization).

## Garde-fous qualite

- Toujours verifier `tsc --noEmit` et `eslint`.
- Tester en premier sur mobile (390px), puis tablette, puis desktop.
- Garder les labels orientes utilisateur, eviter le jargon interne.
