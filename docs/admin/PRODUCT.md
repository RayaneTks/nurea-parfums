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

- Maintenir le catalogue (parfums, marques, visibilité, visuels story).
- Créer et suivre les commandes jusqu'à la livraison et au solde.
- Enregistrer une vente sur le terrain, payée ou à crédit.
- Encaisser les créances et ranger l'argent dans les poches de Trésorerie.
- Consulter la comptabilité, le journal et les lots d'achat.
- Gérer la fiche clients et les relancer.

**Commande et vente sont le même objet** : un « document de vente » (`SaleDocument`,
origine `ORDER` ou `DIRECT_SALE`) avec un cycle de vie unique et un ledger de
paiements unique. Le dû, l'Encaissé et le payé se **dérivent** du ledger — il n'y a
plus de « finaliser en vente », plus de re-saisie, plus de montant dénormalisé.

## Product Personality

- **Opérationnel** — verbes d'action, états explicites (En attente, Confirmée, Livrée, Annulée).
- **iOS-natif** — patterns familiers : tab bar basse, sheets, blur header, safe areas.
- **Direct** — copy française courte, compréhensible sans formation.
- **Fiable** — retours immédiats (toasts, compteurs live), jamais de 500 muets.
- **Sobre** — bordeaux `#7B0B1D` sur fond iOS gray `#F2F2F7`, pas de luxe vitrine (or, serif Didot).

## Flows principaux

Navigation primaire : **cinq onglets**, aucun menu « Plus » (`src/app-shell/navigation.ts`).
Compta, Trésorerie et Lots n'ont plus d'onglet : on y entre **en touchant leur chiffre**
sur l'Accueil — c'est la décision n°1 de la refonte (`docs/refonte/00-README.md`).

| Onglet | Racine | Rattache aussi | Rôle |
|--------|--------|----------------|------|
| **Accueil** | `/admin` | `/admin/journee`, `/admin/compta`, `/admin/compta/journal`, `/admin/lots*`, `/admin/statistiques`, `/admin/reglages` | Ce qu'il y a à faire, les chiffres du mois, l'entrée vers la compta et les lots. |
| **Commandes** | `/admin/commandes` | préfixe | Suivi des commandes à livrer, segments Livrées et Annulées, recherche étendue. |
| **Vendre** | `/admin/vendre` | préfixe | Composeur unique, bascule **Vente \| Commande**. Traitement accentué : l'action la plus fréquente de la journée. |
| **Clients** | `/admin/clients` | `/admin/encaisser` | Fichier clients et écran « À encaisser ». |
| **Catalogue** | `/admin/catalogue` | `parfums/*`, `marques/*` | Parfums, marques, mise en avant, visuels story. |

### Les écrans, par identifiant de `06-ECRANS-PARCOURS.md`

L'inventaire qui fait foi (motif d'URL, paramètres reconnus, jalon, état) est
`src/app-shell/routes.ts` ; `tests/architecture/routes-builders.test.ts` refuse toute
page hors inventaire.

| Écran | Route | Ce qu'on y fait |
|---|---|---|
| E01 Accueil | `/admin` | « À faire », Encaissé du mois, À encaisser, Trésorerie, commandes à livrer, lots ouverts, top parfums. |
| E02 Journée | `/admin/journee?jour=` | Récap du jour, Encaissé par poche, partageable. Navigateur de date qui ne dépasse pas aujourd'hui. |
| E03 Compta | `/admin/compta?vue=ventes\|tresorerie&periode=` | Deux vues. Ventes : Encaissé, Marge nette, dépenses, documents par lot puis hors lot. Trésorerie : poches, transferts, répartitions. |
| E04 Journal | `/admin/compta/journal?mois=&poche=` | Mouvements par mois, net mensuel, lien vers l'origine. |
| E05 Lots | `/admin/lots` | Zone « À rattacher » en tête, puis lots ouverts et clos. |
| E06 Lot | `/admin/lots/[id]?assigner=1` | Cinq tuiles, ventes, commandes, dépenses, notes. |
| E21 Nouveau lot | `/admin/lots/nouveau` | Nom, date prévue, notes. |
| E07 Statistiques | `/admin/statistiques?periode=&pages=` | Classement des parfums en unités, « Hors catalogue » signalé. |
| E08 Réglages | `/admin/reglages` | Poche par défaut, taux DZD par défaut, ordre des poches (S21), version, déconnexion. |
| E10 Commandes | `/admin/commandes?vue=&filtre=&q=&pages=` | Segments À livrer / Livrées / Annulées ; recherche étendue. |
| E11 Vendre | `/admin/vendre?mode=&client=&parfum=&depuis=` | Composeur : lignes, client, « Reçu maintenant », poche, carte de confirmation. |
| E12 Clients | `/admin/clients?q=&pages=` | Liste sectionnée A–Z, badge du dû, « Afficher plus ». |
| E13 À encaisser | `/admin/encaisser?anciennete=30&q=` | Créances groupées par client, plus anciennes d'abord, chip « Plus de 30 jours ». |
| E14 Fiche client | `/admin/clients/[id]?pages=` | Dû, historique, Appeler / WhatsApp / Snap, relance. |
| E20 Formulaire client | `/admin/clients/nouveau`, `/admin/clients/[id]/modifier` | Téléphone normalisé, doublon nommé avant l'envoi. |
| E15 Catalogue | `/admin/catalogue?tab=&q=&stock=&visibilite=&gamme=` | Parfums / Marques / En avant. |
| E16 Fiche parfum | `/admin/catalogue/parfums/[id]` | Tarifs, stock, visibilité, galerie de visuels story. |
| E19 Formulaire parfum | `.../parfums/nouveau`, `.../parfums/[id]/modifier` | Fiche, image sombre + variante claire, grille tarifaire. |
| E17 Formulaire marque | `/admin/catalogue/marques/nouvelle`, `.../[id]/modifier` | Logo jamais recadré, gamme complète. |
| E18 Connexion | `/admin/login?retour=` | **Hors shell** : ni header ni tab bar. |

**La fiche d'un document est une sheet adressable, jamais une page** (amendement A-3) :
`?doc=<id>` sur `/admin/commandes` (origine `ORDER`) ou `/admin/compta` (origine
`DIRECT_SALE`), `&edition=1` pour l'ouvrir en modification. Les paramètres de sheet
sont `doc`, `edition`, `assigner` : ils ne comptent jamais pour l'onglet actif, le
bouton retour ni la mémoire d'onglet.

**Anciennes adresses** : les URL en anglais de l'app d'avant sont servies par les
redirections permanentes de `next.config.mjs`, rejouées une à une par
`tests/architecture/redirects.test.ts`. Les identifiants de documents sont conservés
par la reprise : une ancienne fiche reste joignable.

**Bouton retour** : dérivé de la route par `getParentScreen`, affiché par le header
du shell, jamais pris dans l'historique. Les pages ne rendent jamais leur propre lien
retour. Un retour restitue l'écran parent **avec ses filtres et son défilement**
(mémoire d'onglet, `resolveBack`).

**Un tap sur l'onglet actif** ferme la sheet ouverte ; sinon remonte à la racine de
l'onglet ; sinon défile en haut ; sinon efface les filtres.

**Palette de commandes** (`Cmd+K` / bouton Rechercher) : « Créer », « Aller à », et
recherche globale (parfums, clients, documents) avec **actions de résultat** —
« Encaisser xx € » sur un client, « Vendre » sur un parfum — qui s'exécutent sans
changer d'écran.

**Hors ligne** : `public/admin-offline.html`, page statique autonome (CSS inline, aucune
ressource externe) pré-cachée par le service worker.

**Mode maintenance** : `NUREA_GESTION_MAINTENANCE=1` fait répondre 503 à toute la
gestion sans lire la base — utilisé pendant la fenêtre de bascule.

## Vocabulaire des chiffres

Un même montant porte le même nom partout. Ne pas introduire de synonyme.

| Terme | Définition |
|-------|-----------|
| **Encaissé** | Argent réellement reçu : somme des paiements du ledger sur la période. |
| **À encaisser** | Reste dû par les clients, dérivé du ledger — jamais un scalaire stocké. |
| **Marge nette** | Encaissé − coûts d'achat − dépenses de lot. Toujours après dépenses. |
| **Trésorerie** | Solde cumulé des poches (solde d'ouverture + Σ mouvements). |

**Une seule définition par chiffre**, en SQL, dans `src/server/chiffres/` — avec son
jumeau TypeScript et un test de parité au centime (`tests/db/chiffres-parity.test.ts`).
Deux chiffres qui mesurent la même somme sous deux noms sur un même écran sont un bug.

**Termes bannis** : la liste complète, et le mot à dire à la place, vit dans le test
qui la fait respecter — `tests/architecture/vocabulaire.test.ts`. Ne pas la recopier
ici : deux listes divergent toujours.

## Règles métier (rappel opérationnel)

- **Contenances réelles** : **10 / 50 / 80 ml**, 80 par défaut, source unique
  `src/domain/sale-line.ts`, tenue en base par `line_volume_ck` et `pricing_volume_ck`.
  Une contenance hors règle n'est jamais réécrite en silence : elle est listée à la
  reprise et demandée au premier geste.
- **Rien ne s'efface tout seul** : plus de purge des livrées, plus de suppression sur
  lecture. Une commande livrée quitte le suivi et reste consultable. Un document qui
  porte des paiements ne se supprime pas — il **s'annule**, avec remboursement guidé
  et contre-passation.
- **Suppression** (document sans paiement, client, parfum) = suppression réelle, avec
  confirmation qui dit vrai et filet « Annuler » de 5 secondes.
- **Gamme complète** = entrée marque globale ; parfums individuels masqués si marque en `COMPLETE`.
- **Création parfum** : marque obligatoire ; création auto `CURATED` si absente à la soumission.
- **Images** : `image` = principale (sombre) ; `imageLight` optionnelle ; marque `COMPLETE`
  exige un logo. La conversion WebP se fait **côté serveur** (l'iPhone ne sait pas encoder
  le WebP) ; un logo n'est jamais recadré.
- **Visuels story** : jusqu'à 24 par parfum, sans recadrage, HEIC accepté, récupérés par
  le partage natif avec fichier. Jamais lus par la vitrine : `image` reste seul juge de
  la publication.
- **Stock « non suivi » n'est pas « rupture »** : `NULL` est distinct de 0, et seuls les
  parfums réellement suivis déclenchent une alerte.
- **Poche par défaut** (Réglages) pré-sélectionnée partout : le cas courant coûte zéro tap.
  Le reliquat non réparti va dans la poche système « Non attribué », jamais renommable
  ni archivable.
- **Pas de rôle, pas de journal d'audit** : un seul opérateur (02 §7). Une garde de
  session unique, invisible.

## Contraintes iOS PWA

L'admin est conçu comme une **app iOS installée**, pas un site responsive générique.

| Contrainte | Implémentation |
|------------|----------------|
| Feuille de style isolée | `/admin` ne charge **ni** `app/globals.css` **ni** les polices Google de la vitrine — route groups `app/(shop)` vs `app/admin` avec un root layout minimal. |
| Manifeste dédié | `GET /api/pwa/admin` (`src/lib/pwa/manifests.ts`) — `scope`/`start_url` `/admin`, `standalone`, portrait, `background_color` `#7B0B1D`, icônes 192/512 + entrée `maskable`, raccourcis Vendre / Nouvelle commande / Encaisser. |
| Écran de lancement | `apple-touch-startup-image` × 12 résolutions, sinon flash blanc au démarrage. Les cibles vivent dans **un** fichier, `src/lib/pwa/splash-targets.json`, lu par le script de génération et par `admin-splash.ts`. |
| Icône écran d'accueil | `app/admin/apple-icon.png` (convention de fichier, prioritaire sur `metadata.icons`). |
| Service worker | **Rendu par une route** : `app/admin-sw.js/route.ts`, à partir de `src/app-shell/pwa/service-worker.ts`, versionné par déploiement (`BUILD_ID`). Scope `/admin/` : URL versionnées par leur contenu en cache-first, repli hors ligne sur les navigations. Aucune réponse `/api/*`, jamais. Une nouvelle version **attend** : toast « Nouvelle version prête », jamais de rechargement imposé en pleine vente. |
| Viewport | `viewportFit: cover`, zoom autorisé (WCAG). |
| Barre d'état | `default` + `theme-color` `#F2F2F7` (heure en noir : fond clair obligatoire). |
| Largeur app | `--admin-app-max-width: 430px` — rail iPhone sur desktop. |
| Scroll | `body`/`html` `overflow: hidden` ; zone de scroll unique `.admin-shell-scroll`. |
| Safe areas | `env(safe-area-inset-*)` sur tab bar, header, padding bas de liste. |
| Clavier virtuel | `--admin-vh`, `--admin-keyboard-inset`, `--admin-vv-offset` — **un seul écrivain**, le service viewport du shell, qui les pose sur `<html>` depuis `visualViewport`. Jamais déclarées dans la feuille : la déclaration masquerait la valeur du service. |
| Inputs iOS | `font-size: 16px` minimum (évite le zoom Safari). |
| Hors ligne | `public/admin-offline.html` — HTML statique autonome, CSS inline, aucune ressource externe : il s'affiche sans réseau et sans bundle. |
| Invitation à installer | Carte dans le flux de l'Accueil (iOS Safari hors standalone, plus `beforeinstallprompt`), fermeture persistée. |

**Régénérer les assets PWA** (icône ou couleur d'accent modifiée) :

```bash
node scripts/build-admin-pwa-assets.mjs
```

**Hors scope admin** : pas de dark mode, pas de breakpoints desktop — tout est calibré 320–430px (`src/design/tokens.ts`).

## Anti-References

- Layout bureau multi-colonnes ou sidebar permanente.
- Typographie vitrine (GFS Didot, or `#luxury-gold`, fond charbon).
- Jargon hérité : « Assortiment », « Univers », « Sillage », « Maison » — et tout terme
  refusé par `tests/architecture/vocabulaire.test.ts`.
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
2. **Action en 1–3 taps** — vente simple 3 taps, encaissement d'une créance 4 taps depuis
   l'Accueil, commande avec acompte 9 taps. Cibles et mesures : `docs/refonte/08-RECETTE.md` §4.
3. **État toujours visible** — compteurs commandes, badges retard, filtres avec nombre de résultats.
4. **Erreurs actionnables** — message + correction (« Choisir une marque », pas « Erreur 400 »).
5. **Cohérence navigation** — tab bar = vérité ; routes profondes restent dans le bon onglet actif.
6. **Perf mobile** — un bloc = **une** requête agrégée côté base (un aller-retour coûte
   ~140 ms) ; `cached()` et `react.cache` pour ne pas payer deux fois le même chiffre ;
   titre visible immédiatement, données sous `Suspense`.
7. **Lire ses écritures** — après une écriture, la fiche, la liste et les chiffres sont à
   jour **sans rechargement** (`e2e/parcours/lecture-de-ses-ecritures.spec.ts`).

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
| [`docs/admin/DESIGN.md`](./DESIGN.md) | Design system de la gestion (`register: product`). |
| [`docs/refonte/00-README.md`](../refonte/00-README.md) | Dossier pilote de la refonte : cadre, avancement, ce qui reste avant la bascule. |
| [`docs/refonte/06-ECRANS-PARCOURS.md`](../refonte/06-ECRANS-PARCOURS.md) | Spécification écran par écran (E01…E21, sheets S01…S21). |
| [`docs/refonte/08-RECETTE.md`](../refonte/08-RECETTE.md) | Recette de bascule : chaque capacité, où elle vit, comment elle est vérifiée. |
| [`src/design/tokens.ts`](../../src/design/tokens.ts) | Source **unique** des jetons. |
| [`src/design/globals.admin.css`](../../src/design/globals.admin.css) | Feuille dérivée, tenue par `tests/architecture/tokens-sync.test.ts`. |
| [`src/app-shell/navigation.ts`](../../src/app-shell/navigation.ts) | Onglets, parents, mémoire d'onglet — source de vérité de l'architecture d'information. |
| [`src/app-shell/routes.ts`](../../src/app-shell/routes.ts) | Inventaire des écrans et constructeurs d'URL. |
| [`src/app-shell/AdminShell.tsx`](../../src/app-shell/AdminShell.tsx) | Shell PWA (header, scroll, tab bar). |
