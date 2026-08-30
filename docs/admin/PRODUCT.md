# Nuréa Parfums — Admin Product Context

## Register

`product`

Outil opérationnel mobile-first pour gérer le catalogue, les commandes, les ventes, la comptabilité et les clients. L'efficacité terrain prime sur l'élégance vitrine : chaque écran doit permettre une action claire en quelques secondes.

> **Registre vitrine** : le site public conserve son registre `brand` dans [`PRODUCT.md`](../../PRODUCT.md) à la racine. Ne pas mélanger les deux registres lors des tâches design ou copy.

## Principes registre produit (Impeccable)

Structure alignée sur les principes **registre produit Impeccable** (même schéma que [`PRODUCT.md`](../../PRODUCT.md) vitrine : Register → Users → Purpose → Personality → Anti-Refs → Principles → A11y → Language) :

1. **Register explicite** — `product` vs `brand` : tokens, typo et ton différents.
2. **Utilisateurs cibles nommés** — qui utilise l'outil, dans quel contexte.
3. **But produit mesurable** — quelle tâche opérationnelle est accomplie.
4. **Personnalité / ton** — direct, français, sans jargon ni ambiguïté.
5. **Anti-références** — ce qu'on refuse (slop SaaS, étapes implicites).
6. **Principes stratégiques** — hiérarchie des priorités UX.
7. **Accessibilité & langue** — contraintes non négociables.

## Target Users

- **Gérants Nuréa** — utilisent l'admin sur iPhone, souvent debout, une main, en boutique ou en déplacement.
- **Profil** — non technique, habitué aux apps iOS natives (Réglages, Notes, Banque).
- **Contexte** — prise de commande rapide, suivi livraison, mise à jour catalogue, consultation compta.
- **Device cible** — iPhone en **PWA installée** (`display: standalone`, scope `/admin`). Desktop = cadre 430px centré, pas de layout bureau étendu.

## Product Purpose

Permettre de gérer l'activité quotidienne de Nuréa Parfums sans ouvrir un ordinateur :

- Maintenir le catalogue (parfums, marques, visibilité).
- Créer et suivre les commandes jusqu'à la livraison.
- Enregistrer une vente sur le terrain.
- Consulter la comptabilité et les lots d'achat.
- Gérer la fiche clients.

## Product Personality

- **Opérationnel** — verbes d'action, états explicites (En attente, À traiter, Livré).
- **iOS-natif** — patterns familiers : tab bar basse, sheets, blur header, safe areas.
- **Direct** — copy française courte, compréhensible sans formation.
- **Fiable** — retours immédiats (toasts, compteurs live), jamais de 500 muets.
- **Sobre** — bordeaux `#7B0B1D` sur fond iOS gray `#F2F2F7`, pas de luxe vitrine (or, serif Didot).

## Flows principaux

Navigation primaire : **cinq onglets**, aucun menu « Plus » (`src/app-shell/navigation.ts`).

| Onglet | Route(s) | Rôle |
|--------|----------|------|
| **Accueil** | `/admin` | Alertes, chiffres, compteurs commandes, raccourcis. Rattache aussi `/admin/clients*`, `/admin/stats*`. |
| **Commandes** | `/admin/ordres`, `/admin/ordres/new`, `/admin/ordres/[id]` | Liste groupée par statut, création, détail, paiements, livraison. |
| **Vendre** | `/admin/vendre` | Encaissement terrain. Aussi `?fromOrder=<id>` pour solder une commande. |
| **Compta** | `/admin/compta`, `/admin/lots*` | Deux vues (`?vue=ventes` / `?vue=tresorerie`), lots d'achat. |
| **Catalogue** | `/admin/catalogue`, `/admin/perfumes/*`, `/admin/brands/*` | Parfums, marques, mise en avant. |

**Écrans sans onglet** — Clients, Lots, Statistiques : accessibles depuis les
raccourcis de l'Accueil et la palette de commandes. Ils sont rattachés à l'onglet
Accueil pour que la barre garde un état actif.

**Bouton retour** : dérivé de la route par `getParentScreen`, affiché par le header
du shell. Les pages ne rendent jamais leur propre lien retour.

**Palette de commandes** (`Cmd+K` / bouton Rechercher) : navigation, création et
recherche globale (parfums, clients, commandes).

**Auth** : `/admin/login` — hors shell (ni header ni tab bar).

**Hors ligne** : `/admin/offline` — page de repli mise en cache par le service worker.

## Vocabulaire des chiffres

Un même montant porte le même nom partout. Ne pas introduire de synonyme.

| Terme | Définition |
|-------|-----------|
| **Encaissé** | Argent réellement reçu (ventes + commandes confirmées). |
| **À encaisser** | Reste dû par les clients. |
| **Marge nette** | Encaissé − coûts d'achat − dépenses de lot. |
| **Trésorerie** | Solde cumulé des poches. |

Interdits : « CA », « bénéfice net », « prévision trésorerie », « panier moyen » —
tous redondants avec les quatre ci-dessus ou dérivables d'eux.

## Règles métier (rappel opérationnel)

- **Gamme complète** = entrée marque globale ; parfums individuels masqués si marque en `COMPLETE`.
- **Gammes complètes** gérées via l'onglet Marques (pas de doublon catalogue).
- **Suppression** = suppression réelle avec confirmation explicite.
- **Création parfum** : marque obligatoire ; création auto `CURATED` si absente à la soumission.
- **Images** : `image` = principale ; `imageLight` optionnelle ; marque `COMPLETE` exige image.
- **Filtres catalogue** : drawer marque + « Appliquer » avec compteur ; exclusif avec onglets catégorie.

## Contraintes iOS PWA

L'admin est conçu comme une **app iOS installée**, pas un site responsive générique.

| Contrainte | Implémentation |
|------------|----------------|
| Feuille de style isolée | `/admin` ne charge **ni** `app/globals.css` **ni** les polices Google de la vitrine — route groups `app/(shop)` vs `app/admin` avec un root layout minimal. |
| Manifeste dédié | `getAdminWebManifest()` — scope `/admin`, `standalone`, icônes aux dimensions réelles + entrée `maskable` dédiée. |
| Écran de lancement | `apple-touch-startup-image` × 12 résolutions (`src/lib/pwa/admin-splash.ts`), sinon flash blanc au démarrage. |
| Icône écran d'accueil | `app/admin/apple-icon.png` (convention de fichier, prioritaire sur `metadata.icons`). |
| Service worker | `public/admin-sw.js`, scope `/admin/` : assets versionnés en cache-first, page de repli hors ligne. Aucune réponse d'API mise en cache. |
| Viewport | `viewportFit: cover`, zoom autorisé (WCAG). |
| Barre d'état | `default` + `theme-color` `#F2F2F7` (heure en noir : fond clair obligatoire). |
| Largeur app | `--admin-app-max-width: 430px` — rail iPhone sur desktop. |
| Scroll | `body`/`html` `overflow: hidden` ; zone de scroll unique `.admin-shell-scroll`. |
| Safe areas | `env(safe-area-inset-*)` sur tab bar, header, padding bas de liste. |
| Clavier virtuel | `--admin-keyboard-inset` (`useAdminKeyboardInset`) et `--admin-vh` (`ViewportSync`). |
| Inputs iOS | `font-size: 16px` minimum (évite le zoom Safari). |
| Install hint | `PwaInstallHint` — iOS Safari uniquement, hors standalone, dismiss localStorage. |

**Régénérer les assets PWA** (icône ou couleur d'accent modifiée) :

```bash
node scripts/build-admin-pwa-assets.mjs
```

**Hors scope admin** : pas de dark mode, pas de breakpoints desktop — tout est calibré 320–430px (`src/design/tokens.ts`).

## Anti-References

- Layout bureau multi-colonnes ou sidebar permanente.
- Typographie vitrine (GFS Didot, or `#luxury-gold`, fond charbon).
- Jargon hérité : « Assortiment », « Univers », « Sillage », « Maison ».
- Étapes implicites ou formulaires sans feedback.
- Spinners seuls sans squelette ni message.
- `transition: all` sur les interactions tactiles.
- Gradients violet/bleu, néon, cartes dans des cartes.
- Copy creux : « Bienvenue sur », « N'hésitez pas », « Cliquez ici ».
- Deux formulaires concurrents pour la même tâche (« rapide » vs « complet ») :
  un seul écran, champs facultatifs repliés.
- Deux systèmes de composants en parallèle. Tout passe par `src/ui/*`.

## Strategic Product Principles

1. **Mobile terrain d'abord** — une main, pouce, 44px minimum (`--admin-touch-min`).
2. **Action en 1–3 taps** — commande rapide ~30 s, raccourcis tableau de bord.
3. **État toujours visible** — compteurs commandes, badges retard, filtres avec nombre de résultats.
4. **Erreurs actionnables** — message + correction (« Choisir une marque », pas « Erreur 400 »).
5. **Cohérence navigation** — tab bar = vérité ; routes profondes restent dans le bon onglet actif.
6. **Perf mobile** — `select` Prisma explicites, éviter appels DB concurrents inutiles.

## Accessibility

- Contraste WCAG AA sur texte `--admin-text` / fond `--admin-bg` et `--admin-surface`.
- Touch targets ≥ 44×44px (`--admin-touch-min`).
- `aria-label` sur boutons icône-seuls ; `aria-current="page"` sur onglet actif.
- Focus visible : outline bordeaux `2px solid var(--admin-accent)`.
- `prefers-reduced-motion` : désactive `tap-scale`, squelettes pulse, animations nav.
- Un seul landmark `<main>` par page (shell = `div` scroll).

## Language

Interface, copy, toasts et erreurs en **français**. Termes usuels : Marque, Gamme complète, Visible, Masqué, Supprimer, Commande, Client.

L'agent répond en français sauf demande contraire.

## Fichiers de référence

| Fichier | Rôle |
|---------|------|
| [`docs/admin/DESIGN.md`](./DESIGN.md) | Design system admin (`register: product`). |
| [`src/design/globals.admin.css`](../../src/design/globals.admin.css) | Tokens CSS admin. |
| [`src/design/tokens.ts`](../../src/design/tokens.ts) | Source de vérité tokens TS. |
| [`src/app-shell/AdminShell.tsx`](../../src/app-shell/AdminShell.tsx) | Shell PWA (header, scroll, tab bar). |
| [`.cursor/rules/project-memory.mdc`](../../.cursor/rules/project-memory.mdc) | Mémoire métier et UX transversale. |
