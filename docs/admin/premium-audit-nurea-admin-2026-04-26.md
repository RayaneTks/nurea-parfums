# Revue premium — admin Nuréa (PWA)

Date : 2026-04-26. Périmètre : shell `NureaAdminShell`, `AdminShellClient`, pages `src/components/admin/nurea/*`, chargements RSC, styles `app/globals.css` (`.admin-theme`, `.admin-bottom-nav`).

---

## 1. Audit (technique / a11y / perf)

### Anti-patterns « slop »

- **Verdict** : plutôt **pass** — palette bordeaux / neutres cohérente, pas de gradient texte ni métriques hero génériques sur le shell ; le catalogue mélange tokens `neutral-*` et admin, assumé volontairement pour la DA Nuréa light.
- **Suivi** : harmoniser progressivement `neutral` vs `admin-*` sur les cartes catalogue si l’on veut une seule source de tokens.

### Accessibilité

- **Points positifs** : `aria-label` sur la nav principale et le bouton recherche ; `aria-current="page"` sur l’onglet actif ; focus visible global `.admin-theme *:focus-visible` (outline bordeaux).
- **Points traités dans ce lot** : suppression des `main` imbriqués (shell en `div` scroll) ; squelettes `AdminRouteFallback` / `AdminOrderDetailBodySkeleton` sans `<main>` dupliqué ; recherche catalogue en `focus-visible:ring` pour limiter le halo au clavier.
- **Reste** : vérifier que chaque écran garde un seul `<main id="main-content">` (pages Nuréa).

### Performance

- **Catalogue** : `useReducedMotion()` sur le `motion.div` d’entête pour respecter `prefers-reduced-motion`.
- **Global** : `.tap-scale` et `.admin-card-press` neutralisés sous `prefers-reduced-motion: reduce`.

### Responsive / PWA

- **Corrigé** : barre basse via `.admin-bottom-nav` (max-width 430px, centrage, safe area, z-index 60). Padding du scroll aligné sur `calc(5.5rem + env(safe-area-inset-bottom))`.

### Thème

- Curseur : `pointer` / `not-allowed` sur boutons et liens dans `.admin-theme` (route admin).

---

## 2. Critique UX (direction)

### Ce qui fonctionne

- Cadre type « téléphone » sur grand écran renforcé par la nav alignée au rail 430px.
- Tab bar en bas, pattern familier pour une app terrain / PWA.

### Problèmes prioritaires (résolus ou atténués)

| Sujet | Avant | Après |
|--------|--------|--------|
| Barre d’onglets | Pleine largeur écran (fixed sans max-width) | Alignée 430px, styles partagés avec le design system admin |
| Hiérarchie des landmarks | `main` dans `main` | Conteneur scroll du shell = `div` ; `main` laissé aux pages |
| Motion | Entrée catalogue toujours animée | Skip si `prefers-reduced-motion` |
| Squelette route | `main` interne + pb arbitraire | `div` + pb harmonisé |

### Questions / chantiers (hors lot)

- Toasts : présence côté catalogue — s’assurer d’une zone non masquée par la bottom nav.
- Compta (graphiques) : vérifier la lisibilité des graphiques `recharts` sur 320px de large.

---

## 3. Polish (finitions)

- Lien d’onglets : `rounded-md` sur les cibles de la bottom nav (meilleur rendu du focus).
- Cohérence `focus-visible` sur le champ de recherche du catalogue.
- Dernière couche : **ne pas** ajouter d’ombres / gradients décoratifs sans besoin (reste aligné [frontend-design]).

---

## 4. Optimisation (hypothèses)

- **Bundle** : `motion` déjà importé sur la page catalogue — acceptable ; si le bundle page grossit, envisager `dynamic()` pour un sous-arbre lourd.
- **Listes longues** : à terme, `content-visibility` ou virtualisation sur listes parfums si mesures prouvées.

---

## 5. Table Priorité × Effort (relève)

| Priorité | Effort | Action |
|----------|--------|--------|
| P0 | Faible | Nav 430px — **fait** |
| P1 | Faible | Landmarks, curseurs, reduced motion — **fait** |
| P2 | Moyen | Unifier tokens `neutral` / `admin` sur tout le module Nuréa |
| P3 | Faible | Tests e2e sur sélecteurs touchant la structure DOM |

---

*Document généré dans le cadre du plan « Admin Nuréa — cadre PWA, polish, audit ».*
