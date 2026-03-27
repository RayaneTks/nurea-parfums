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
  - Si un parfum possède une image Claire & Sombre, n'afficher qu'une seule vignette dans les listes.
  - Utiliser le wording explicite `(Dark)` et `(Light)` dans les formulaires.

## Méthodologie & Réflexion (Auto-amélioration continue)

Cette section centralise nos apprentissages pour garantir une qualité irréprochable et "App-like" sur les interfaces d'administration.

1. **Progressive Disclosure & Quick Look** :
   - Ne pas encombrer les listes (Thumbnail Trap). L'image en liste est un repère (80x60px), pas un visualiseur.
   - Les détails riches (comme la bascule d'image Light/Dark) doivent être délégués à une vue plein écran accessible via un simple tap : le **Visualizer Drawer**.
2. **App-Feel & PWA (iOS)** :
   - **No Zoom** : Le layout doit interdire le zoom (`user-scalable=no` dans le viewport) pour éviter les sauts d'écran au clic sur les inputs.
   - **Safe Zones** : Utilisation stricte de `env(safe-area-inset-top)` et `bottom`.
   - **Swipe-to-Dismiss** : Les tiroirs d'aperçu doivent pouvoir être fermés intuitivement en glissant vers le bas (Touch events).
   - **Start URL** : Pour une app sécurisée ajoutée à l'écran d'accueil, `start_url` doit forcer la page de login (`/admin/login`) ou être géré par le middleware.
3. **Affordance Tactile & Ergonomie** :
   - **Hitbox** : 44x44px minimum pour tout bouton ou icône interactive.
   - **Feedback Visuel** : Chaque zone interactive doit utiliser `active:scale-95` ou `active:bg-zinc-900/80` pour compenser l'absence de `:hover` sur mobile.
   - **Sticky Actions** : Les Call-To-Action majeurs (ex: Enregistrer) doivent être positionnés en bas de l'écran (`sticky bottom-6`) pour rester accessibles au pouce sans scroller.
   - **Z-Index Strategy** : Les modales d'action (ConfirmDelete) doivent être des "Bottom Drawers".
4. **Performance Perçue & Build** :
   - **API Grouping** : Fusionner les appels parallèles (ex: un endpoint `/api/admin/catalogue` au lieu de deux) réduit considérablement la latence.
   - **Skeletons** : Prévenir le "Flash of Empty Data" (afficher `0` puis `10`) en rendant un état `isLoading` explicite (barres clignotantes).
   - **Redirections Contextuelles** : L'utilisateur doit revenir à son point de départ précis (`/admin/catalogue?tab=brands`) après une action, sans devoir re-naviguer.
   - **Suspense** : Toujours envelopper `useSearchParams()` avec `<Suspense>` pour ne pas casser le SSR/SSG de Next.js (CSR Bailout).

## Garde-fous qualite

- Toujours verifier `tsc --noEmit` et `eslint`.
- Tester en premier sur mobile (390px), puis tablette, puis desktop.
- Garder les labels orientes utilisateur, eviter le jargon interne.
