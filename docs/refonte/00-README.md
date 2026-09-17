# Refonte Nuréa Gestion — Dossier pilote

> **Statut** : **conception terminée** (docs 00 à 07, vérifiés en croisé) —
> exécution à démarrer au jalon J0 de `07-PLAN-EXECUTION.md`. Démarré le 17 septembre 2026.
> **Objet** : refonte complète, from scratch, de l'application de gestion (`/admin`),
> dite « Nuréa Gestion ». La vitrine publique (`app/(shop)`) n'est **pas** dans le
> périmètre, mais ses dépendances aux tables partagées sont une contrainte dure.

## Pourquoi une refonte

L'application actuelle est fonctionnelle mais s'est construite par corrections et
ajouts successifs : incohérences entre écrans, caches dénormalisés fragiles,
dualité structurelle commandes/ventes, chemins dupliqués vers la même tâche.
Plutôt que d'empiler une rustine de plus, on repart d'une conception propre —
sans rien perdre : la nouvelle version doit couvrir 100 % de l'existant
(liste de non-régression dans `01-AUDIT-EXISTANT.md`, §3).

## Directive prioritaire (donnée par le client le 17/09/2026)

**La priorité n°1 est la prise en main, la facilité d'utilisation et l'aspect
pratique** : l'app doit rendre les tâches terrain rapides et agréables. Ajouter
des fonctionnalités absentes de l'existant est bienvenu si ça sert l'usage réel.
**La sécurité est explicitement secondaire** : un garde simple et invisible
suffit (un seul opérateur en pratique) — on corrige les trous béants de l'audit
au passage, sans en faire un chantier ni ajouter de friction.

## Ce que la refonte doit livrer

- Une app **web + PWA iOS installée** (rail 430 px, standalone, offline de repli),
  mobile-first une main, gestes intuitifs.
- La **même identité** : registre `product`, bordeaux `#7B0B1D` sur neutres iOS,
  SF system, français direct — version évoluée et premium, pas une autre app.
- Un **modèle de données irréprochable** (MCD → MLD documentés) sans les défauts
  relevés par l'audit.
- Des **workflows impeccables** : chaque tâche terrain en 1–3 taps, un seul chemin
  par tâche, états toujours visibles.
- Zéro régression fonctionnelle : l'utilisateur retrouve tout, en mieux.

## La série de documents

Chaque document est autoportant et se lit dans l'ordre. C'est la passation
complète : un agent (ou un humain) qui n'a jamais vu ce repo peut exécuter la
refonte en lisant cette série.

| Doc | Contenu | Statut |
|---|---|---|
| `00-README.md` | Ce document — cadre et méthode. | ✅ |
| `01-AUDIT-EXISTANT.md` | Audit exhaustif de l'app actuelle : carte fonctionnelle (non-régression), bugs confirmés, incohérences, dette, forces à préserver, contraintes vitrine. | ✅ |
| `02-VISION-PRODUIT.md` | Vision cible : utilisateurs, tâches, principes, vocabulaire, périmètre v1. | ✅ |
| `03-MODELE-DONNEES.md` | MCD (entités/relations) puis MLD (schéma Prisma cible), stratégie de migration des données existantes. | ✅ |
| `04-ARCHITECTURE.md` | Architecture applicative : arborescence, couches (RSC / server actions / services), auth, transactions, invariants d'intégrité, PWA. | ✅ |
| `05-DESIGN-SYSTEM.md` | Design system : tokens, primitives, patterns, motion, a11y — hérité de l'existant, consolidé. | ✅ |
| `06-ECRANS-PARCOURS.md` | Architecture d'information, navigation, spec écran par écran avec états (vide/chargement/erreur) et gestes. | ✅ |
| `07-PLAN-EXECUTION.md` | Ordre de construction, jalons vérifiables, stratégie de bascule et de migration, critères d'acceptation. | ✅ |

## Méthode

1. **Comprendre** ✅ — audit multi-agents de l'existant (11 domaines), bugs
   contre-vérifiés adversarialement (doc 01).
2. **Concevoir** ✅ — vision (02) ; modèle de données arbitré entre trois
   propositions concurrentes (03) ; parcours arbitrés entre trois propositions
   — vitesse, clarté, iOS natif (06) ; architecture (04) ; design system (05).
3. **Planifier** ✅ — 17 jalons vérifiables, bascule répétée, migration chiffrée (07).
4. **Vérifier** ✅ — deux relectures croisées (données/technique, UX/produit) :
   27 incohérences relevées dont 7 bloquantes, toutes corrigées dans les docs.
5. **Exécuter** — à démarrer : suivre `07-PLAN-EXECUTION.md` à partir de J0.

## Reprendre le travail (passation)

Pour un agent ou un développeur qui arrive sur le chantier :

1. Lire **ce document**, puis `02-VISION-PRODUIT.md` en entier (30 min) — c'est
   le « pourquoi » de toutes les décisions techniques.
2. Lire `07-PLAN-EXECUTION.md` §0 et §3.0 (conventions communes des jalons).
3. Ouvrir le jalon en cours ; ne lire les docs 03–06 **qu'aux sections que le
   jalon cite**. 01 sert de référence (bugs, non-régression), pas de lecture suivie.
4. **Règle d'or** : si un jalon remet en cause une décision, on amende d'abord le
   document amont concerné, puis on code. Une documentation qui ment est un bug.
5. Après tout jalon d'UI : `npm run test:layout`. Après tout jalon d'argent : les
   tests de parité des chiffres et la reprise rejouée sur copie (07 §2.4).

**Points ouverts laissés à l'exécutant** (marqués dans 07) : vérifier que la build
ne touche pas la base ; essayer `vercel deploy --skip-domain` + `promote` en J16 ;
le premier rejeu de la reprise sur copie réelle (J2) dira s'il existe des poches
archivées non vides. Le SQL de 03 (CHECK, triggers, vue) a été relu mais **pas
exécuté** (pas de Postgres local lors de la conception) : il s'éprouve en J1–J2.

## Décisions qui changent le quotidien du gérant — tranchées

Le client a délégué les arbitrages (« travaille en autonomie, fais les choix,
qu'ils soient clairs et intuitifs »). Ces points sont donc **décidés** le
17/09/2026 et font foi ; on ne les resoumet pas. Ils modifient des habitudes :
la carte « Nouveautés » de l'Accueil (06 E01) les explique au premier lancement.
Un retour d'usage du gérant en préproduction peut les amender, dans le doc cité.

| # | Décision | Ce qui change pour lui | Où |
|---|---|---|---|
| 1 | **Onglets : Accueil · Commandes · Vendre · Clients · Catalogue** — l'onglet Compta disparaît ; on entre dans la compta, la Trésorerie et les lots **en touchant leur chiffre** sur l'Accueil. | Clients (et « À encaisser ») à 1 tap au lieu de 2 ; la compta, lue le soir, passe par l'Accueil. | 06 arbitrage n°1–3 |
| 2 | **Commande et vente deviennent le même objet** (un « document ») ; un seul écran de saisie avec bascule « Vente \| Commande ». | Plus de « Finaliser en vente » ni de re-saisie : livrer + encaisser suffit. | 02 §4, 03 §1 |
| 3 | **Plus rien ne s'efface tout seul** : les commandes livrées ne sont plus supprimées à J+1, elles se replient. Un document payé ne se supprime pas, il s'annule (remboursement proposé). | Historique complet et dettes jamais perdues ; la liste Livrées se consulte au lieu de disparaître. | 02 §4.1, 03 §4.4 |
| 4 | **« Reçu maintenant »** à la vente : on saisit l'argent reçu, le reste dû se calcule. | Fin de la saisie inversée « ce qui restera dû ». | 02 §5 N1 |
| 5 | **Stock « non suivi » distinct de « rupture »** ; à la reprise, les stocks ≤ 0 passent en « non suivi » (listés au rapport). | Fin des fausses alertes stock ; il faut ressaisir le stock des parfums réellement suivis. | 02 §4.5, 03 §7 |
| 6 | **Une seule définition de chaque chiffre** — notamment « en retard » dès le jour dépassé (plus de tolérance 24 h) et la Marge nette toujours après dépenses. | Certains chiffres affichés changeront de valeur le jour J (écarts expliqués au centime dans le rapport de reprise). | 02 §6, 07 §2.5–2.6 |
| 7 | **Rôles supprimés, journal d'audit supprimé** (mono-opérateur). | Rien au quotidien ; réintroduction possible si un second opérateur arrive. | 02 §7 |

## Invariants non négociables (hérités, vérifiés, conservés)

- Deux registres CSS disjoints (`brand` vitrine / `product` admin) — root layout
  minimal sans CSS.
- Cinq onglets max, pas de menu « Plus » ; toute route rattachée à un onglet.
- Vocabulaire des chiffres : **Encaissé / À encaisser / Marge nette / Trésorerie**
  — jamais de synonyme.
- Invariants d'affichage automatisés (`npm run test:layout`) : 320/375/430 px,
  clavier ouvert/fermé.
- Cibles tactiles ≥ 44 px, safe areas, une seule zone de scroll.
- `useSearchParams()` toujours sous `<Suspense>`.
- Coût réseau : agréger côté base, `react.cache`, titre visible immédiatement.
