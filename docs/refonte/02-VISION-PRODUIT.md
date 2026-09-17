# 02 — Vision produit

**Date : 17 septembre 2026.**

**But du document.** Définir la cible produit de la refonte de « Nuréa Gestion » (PWA admin iOS de Nuréa Parfums) : qui l'utilise, quelles tâches doivent devenir rapides, selon quels principes, avec quel périmètre v1 — capacité par capacité — et quel vocabulaire canonique des chiffres. Chaque capacité de la carte fonctionnelle de l'audit (`docs/refonte/01-AUDIT-EXISTANT.md`, §3) reçoit ici une décision explicite : **Garder / Simplifier / Fusionner / Abandonner**. Ce document est autoportant : un exécutant qui n'a jamais vu ce repo peut en dériver la conception sans autre contexte que la série `docs/refonte/`.

**Docs amont** : `docs/refonte/00-README.md` (cadre et invariants), `docs/refonte/01-AUDIT-EXISTANT.md` (carte fonctionnelle §3, bugs §4, contrat vitrine §5).
**Docs aval** : `03-MODELE-DONNEES.md` (matérialise les décisions de modèle prises ici), `04-ARCHITECTURE.md`, `05-DESIGN-SYSTEM.md`, `06-ECRANS-PARCOURS.md`, `07-PLAN-EXECUTION.md`.

**Directive prioritaire du client** : la priorité n°1 est la prise en main et l'aspect pratique — l'app doit rendre les tâches terrain rapides et agréables. La sécurité est explicitement secondaire : un garde simple et invisible suffit (voir §7).

---

## 1. Utilisateur & contexte réel

Un seul utilisateur réel : **le gérant de Nuréa Parfums**. Il vend des parfums en direct (boutique, déplacement, réseaux sociaux), prend des commandes, encaisse souvent en espèces, suit ses lots fournisseur (achats en dinars algériens, revente en euros) et fait sa compta lui-même.

Son contexte d'usage, constaté par l'audit et confirmé par `docs/admin/PRODUCT.md` :

- **iPhone, PWA installée** (`display: standalone`, scope `/admin`), rail 430 px sur desktop — jamais de layout bureau.
- **Une main, debout, souvent en pleine vente** : le pouce fait tout, les deux tiers bas de l'écran portent les actions, cibles ≥ 44 px.
- **Non technique**, habitué aux apps iOS natives (Réglages, Notes, apps bancaires).
- **Connexion mobile parfois mauvaise** : retours immédiats obligatoires, page hors-ligne de repli, jamais de spinner muet.

**Ce que ça implique — et que la refonte assume :**

- **Pas de multi-rôles.** Un seul opérateur ⇒ pas d'écrans d'administration d'équipe, pas de gestion de comptes dans l'app, pas d'attribution « qui a fait quoi » (c'est toujours lui). Les rôles VIEWER/EDITOR/OWNER de l'existant, jamais réellement appliqués (01 §4.7), disparaissent.
- **Pas de workflow de validation.** Personne ne relit personne : les gestes se confirment (dialogue de réserve) ou s'annulent (undo), ils n'attendent jamais un tiers.
- **La mémoire de l'app remplace la mémoire de l'utilisateur.** Prix pratiqués, taux de change, poche d'encaissement, lot en cours : tout ce qui se ressaisit à l'identique doit être pré-rempli.
- **Une session qui dure.** Le téléphone est personnel : session longue (7 jours renouvelés), déconnexion possible mais jamais imposée en pleine journée.

---

## 2. Les tâches à rendre faciles

Jobs-to-be-done classés par fréquence réelle, déduite de l'audit (l'onglet Vendre est le bouton accentué de la tab bar, l'écran Encaisser est la cible de la tuile principale du dashboard, la liste des commandes est groupée par urgence de livraison — c'est le cœur quotidien ; catalogue, lots et bilan sont périodiques).

Les objectifs de vitesse se comptent **depuis l'ouverture de l'app** (PWA installée, écran Accueil), formulaire pré-rempli par les mémoires de l'app. Ils sont des critères d'acceptation pour `06-ECRANS-PARCOURS.md` et `07-PLAN-EXECUTION.md`.

| # | Tâche | Fréquence | Objectif de vitesse |
|---|---|---|---|
| 1 | **Vendre et encaisser** une vente simple (1 ligne, client de passage, tout payé, poche par défaut) | Plusieurs fois par jour | ≤ 8 taps, < 20 s |
| 2 | **Encaisser une créance** (montant pré-rempli au dû, poche par défaut) | Quotidien | ≤ 4 taps depuis l'Accueil, < 10 s |
| 3 | **Prendre une commande** (client lié, 1–2 lignes, acompte) | Quotidien | ≤ 15 taps, < 60 s |
| 4 | **Suivre une livraison** : pointer une ligne livrée / passer la commande en livrée | Quotidien | 2 taps par ligne depuis la fiche ; livraison complète ≤ 3 taps |
| 5 | **Enregistrer un paiement sur une commande** (acompte ou solde) | Quotidien | ≤ 5 taps depuis la fiche |
| 6 | **Consulter le dû d'un client** (et le relancer) | Hebdomadaire | 2 taps jusqu'à la fiche ; chiffre identique à Encaisser ; relance partageable en 2 taps de plus |
| 7 | **Mettre à jour le catalogue** (nouveau parfum, photo comprise) | Hebdomadaire | < 90 s ; bascule de visibilité en 1 tap |
| 8 | **Suivre un lot** : ajouter une dépense, consulter la marge | Hebdo / mensuel | Dépense ≤ 5 taps ; marge d'un lot visible en 2 taps |
| 9 | **Faire le bilan** (journée, mois) | Quotidien (soir) / mensuel | Récap de journée en 1 tap ; compta du mois en 2 taps |

Règle transverse : **aucune tâche du tableau ne doit exiger un « second passage »** (revenir plus tard répartir l'argent, rattacher le lot, corriger le reste dû). Les seconds passages relevés par l'audit — ventilation des poches après coup, rattachement au lot après création, correction du reste dû dans le ticket — sont tous supprimés par le périmètre v1 (§4) ou les nouveautés (§5).

---

## 3. Principes produit hiérarchisés

En cas de conflit, le principe de rang inférieur cède.

1. **Le terrain d'abord.** Chaque écran est conçu pour une main, debout, interrompu à tout moment. Ce qui ne sert pas une tâche du §2 n'existe pas.
2. **Action en 1–3 taps.** Les gestes quotidiens (vendre, encaisser, pointer une livraison) tiennent en 1 à 3 taps une fois sur le bon écran ; les mémoires de l'app (prix, taux, poche, lot) suppriment la saisie répétée.
3. **UN seul chemin par tâche.** Une seule pile d'écriture par entité, un seul formulaire par geste, une seule définition de chaque règle. L'existant avait deux piles (server actions vs REST legacy), deux modèles de dette, deux chemins pour solder une vente : la refonte n'en reconduit aucun en double. Corollaire : le code mort n'est jamais reconduit.
4. **Un chiffre = une définition.** Encaissé, À encaisser, Marge nette, Trésorerie (et leurs dérivés « dû », « en retard », « semaine », « mois ») ont chacun UNE définition (§6), calculée par UNE fonction serveur partagée. Deux tuiles voisines ne parlent jamais deux périmètres.
5. **Zéro perte de données silencieuse.** Toute écriture d'argent est atomique (mutation + mouvement de Trésorerie dans la même transaction) ; toute annulation contre-passe ; rien n'est détruit par une lecture ; toute suppression a une confirmation et, quand c'est possible, un undo. L'historique comptable survit aux suppressions du référentiel (snapshots).
6. **État toujours visible.** L'écran reflète l'écriture immédiatement (paiement enregistré ⇒ tuiles Dû/Payé et statut à jour sans re-navigation) ; compteurs, badges de retard, filtres avec nombre de résultats ; « rien à faire ⇒ rien rendu ».
7. **Erreurs actionnables.** Message en français + geste de correction (« Rends d'abord la marque visible »), jamais de code brut ni de message Prisma.
8. **La sécurité ne se voit pas.** Elle existe (garde serveur systématique, §7) mais ne coûte jamais un tap au quotidien.

**Pourquoi cette refonte réussira là où la « gestion v2 » a échoué.** L'audit (01 §4.8) montre qu'une refonte a déjà été tentée : la migration `20260831210000_gestion_v2` créait de nouvelles tables sur une branche jamais fusionnée, sans vision produit ni plan de bascule, et a été retirée. La présente série inverse la méthode : décisions produit d'abord (ce document), modèle ensuite (03), et une bascule par jalons vérifiables avec migration des données existantes (07) — jamais un « big bang » de schéma orphelin.

---

## 4. Périmètre v1

Reprise de la carte fonctionnelle (01 §3), capacité par capacité. **Toute capacité non listée « Abandonner » doit exister en v1** — c'est la liste de non-régression. « Simplifier » = la capacité demeure, débarrassée de sa complexité accidentelle ; « Fusionner » = la capacité demeure, portée par un mécanisme partagé.

**La décision structurante, d'abord** — elle irrigue toutes les lignes qui suivent :

> **Fusionner `Order` et `Sale` en un seul « document de vente »** avec un cycle de vie unique (commande → confirmée → livrée → soldée, ou vente directe née livrée), un **ledger de paiements unique** (le modèle `PaymentTransaction` de l'existant, généralisé : montants positifs, sens porté par le type, annulation par contre-écriture) et des **snapshots figés par ligne**. Le « pont fromOrder » (qui perdait coûts DZD, taux, dons, client et lot — 01 §4.2), le champ `Sale.remainingDue` (dette scalaire « legacy » devenue pivot), les caches `depositPaid`/`depositAmount` à trois écrivains et les six réimplémentations de la somme des paiements disparaissent ensemble : le dû, l'Encaissé et le payé se **dérivent** du ledger. Le détail (MCD/MLD, migration des données) est l'objet de `03-MODELE-DONNEES.md`.

### 4.1 Commandes

| Capacité (01 §3.1) | Décision | Justification |
|---|---|---|
| Liste groupée par urgence (En retard / Aujourd'hui / À traiter / À venir / Livrées) + compteurs + filtre URL | **Garder** | Groupes orientés action, force reconnue de l'existant. |
| Plafond 200 lignes sans pagination ni recherche | **Simplifier** | Pagination + recherche client ; « Livrées » repliées par défaut (archivage visuel, pas suppression). |
| Création : client lié ou libre, lignes catalogue / hors-catalogue, volumes 30/50/100, don, coût DZD + taux, notes du document et note par ligne, date de livraison | **Garder** | Cœur du métier ; le hors-catalogue et le don sont intégrés de bout en bout. |
| Acompte initial à la création → confirmation immédiate | **Simplifier** | Même chemin de paiement que partout (ledger + mouvement de poche dans la même transaction) — corrige l'acompte sans poche (bug haute 01 §4.9). |
| Mémoire de prix `PerfumePricing` (pré-remplissage prix/coût/taux) | **Garder** | Descend la saisie d'une ligne à 2–3 taps. Devient apprenante (§5, N8). |
| Cycle de statuts avec réserves confirmables (`canTransition`, domaine pur testé) | **Garder** | « On n'interdit que ce qui casse les données » : philosophie à conserver telle quelle ; la contradiction garde-domaine/API (commande offerte bloquée) disparaît avec la pile unique. |
| Statut CANCELLED zombie (trois philosophies contradictoires) | **Simplifier** | L'annulation redevient un vrai état : elle contre-passe les paiements (remboursement guidé, poche choisie) et la commande annulée reste consultable. « Supprimer pour annuler » disparaît. |
| Paiements sur fiche : sheet acompte/solde, historique typé, annulation par contre-écriture | **Garder** | Le bon modèle comptable ; le REFUND est désormais lié au paiement qu'il annule (corrige le cache d'acompte amputé). |
| Livraison partielle par ligne (stepper, clamp serveur, optimistic + rollback) | **Garder** | Excellent existant ; l'édition d'une commande ne remet plus jamais la livraison à zéro (bug haute 01 §4.1). |
| Finalisation en vente (`?fromOrder`, re-création d'une `Sale`) | **Fusionner** | Absorbée par le document unique : « livrer et solder » est un changement d'état + encaissement, plus une re-saisie. Supprime le double comptage Trésorerie (problème n°2 de l'audit) et les cinq pertes de données du pont. |
| Duplication « réassort » | **Garder** | Économise une re-saisie complète ; validation des volumes corrigée. |
| Suppression avec confirmation + undo 5 s | **Garder** | Réservée aux erreurs de saisie ; sur un document ayant des paiements, l'annulation (contre-passée) est proposée d'abord. |
| Purge « éphémère » : livrées hard-delete à J+1, déclenchée par des GET | **Abandonner** | Perte d'historique et de créances, mouvements orphelins, destruction sur lecture (problème n°6). Remplacée par : rien ne s'efface, les documents soldés se replient. |
| Rattachement aux lots (BatchPicker fiche + masse) | **Garder** | Possible dès la création (§5, N9) — supprime le second passage. |
| Partage du récap client (Web Share), marge estimée, nom éditable inline | **Garder** | Le « payé » du récap devient la somme réelle des paiements (corrige le récap faux). |
| Pile REST legacy commandes (POST/PATCH/GET avec purge, cache d'acompte écrit à la main) | **Abandonner** | Une seule pile d'écriture (principe 3) ; les règles divergentes de la REST sont la source de la moitié des bugs du domaine. |
| `Order.deliveredAt` + index (morts), `orderListFilterSchema` (mort), `cancelOrderAction` sans appelant | **Abandonner** | Code et champs morts, non reconduits. |

### 4.2 Vendre / Encaisser

| Capacité (01 §3.2) | Décision | Justification |
|---|---|---|
| Vente directe multi-lignes (picker, volumes, stepper, prix €, coût DZD, taux par ligne) | **Garder** | Cœur quotidien (tâche n°1). |
| Pré-remplissage pricing à l'ajout et au changement de volume | **Garder** | Idem commandes. |
| Mémoire du dernier taux de change (localStorage, défaut 277 en dur ×3) | **Simplifier** | Le taux par défaut devient un réglage serveur (écran Réglages, §5 N3) : fini les constantes en dur et la mémoire par appareil. |
| Dons (`isGift`, prix forcé à 0) | **Garder** | Contraint côté serveur (isGift ⇒ prix 0) ; décocher restaure le dernier prix connu. |
| Hors-catalogue : saisie libre normalisée, rattachement marque, détection doublon | **Garder** | Attaque la racine des doublons phonétiques — à reprendre tel quel. |
| Rattachement client (fiche liée ou « client de passage ») | **Garder** | La FK client est TOUJOURS propagée (corrige l'historique client vide après finalisation). |
| Total, marge temps réel, calculatrice « reçu espèces → à rendre » | **Garder** | Micro-UX terrain juste. |
| Répartition par poches (`PocketSplit`), reliquat vers « Non attribué » | **Simplifier** | Poche par défaut pré-sélectionnée (§5 N2) + plafond serveur (Σ répartitions ≤ encaissé). Le cas courant : zéro tap. |
| Vente à crédit (impossible aujourd'hui : `remainingDue` saisi à l'envers, après coup) | **Fusionner** | Champ « Reçu maintenant » à la création (§5 N1) : le dû se dérive du ledger. Supprime la saisie inversée « ce qui restera dû ». |
| Solde de commande via `?fromOrder` | **Fusionner** | Voir décision structurante (4.1). |
| Décrément du stock à la vente, restitution à la suppression | **Garder** | Étendu à TOUS les chemins d'édition (le PATCH qui ne réajustait jamais le stock disparaît avec la pile unique) ; plancher explicite (voir stock, 4.5). |
| Écran « À encaisser » (`/admin/encaisser`) : créances unifiées, plus anciennes d'abord, > 30 j signalées | **Garder** | « Vraie réussite de conception » (audit) — encore plus simple sur un modèle de dette unique. |
| `CollectSheet` : montant pré-rempli, « La moitié / Tout solder », poche, plafonné serveur | **Garder** | Le plafonnement au dû devient systématique (commandes comprises) ; « La moitié » arrondit à l'euro (espèces). |
| Correction du reste dû en champ libre dans le ticket compta | **Abandonner** | Deux chemins pour la même action, dont un sans poche ni contre-passation. La dette ne s'édite plus : elle se paie (encaissement) ou se contre-passe (annulation d'un paiement). |
| `Sale.remainingDue` (scalaire « legacy » pivot du cash-basis) | **Abandonner** | Dérivé du ledger unique (décision structurante). |
| `src/server/sales/actions.ts` (354 lignes mortes à logique contraire), `src/domain/money.ts` (mort) | **Abandonner** | Code mort ; la conversion DZD→EUR n'existe qu'en UN exemplaire dans la cible. |

### 4.3 Compta / Trésorerie

| Capacité (01 §3.3) | Décision | Justification |
|---|---|---|
| Écran compta à deux vues (Ventes / Trésorerie), vue dans l'URL | **Garder** | Deep-links du dashboard conservés. |
| Tuiles Encaissé / Marge nette, bandeau À encaisser, dépenses déduites | **Garder** | Servies par UNE fonction de calcul partagée (dashboard, compta, lots) — supprime les périmètres divergents entre tuiles voisines. |
| Liste par sections (commandes en cours / lots / hors lot), groupes repliables | **Simplifier** | Un seul type de document simplifie les sections : documents de la période groupés par lot, puis une section « Hors lot » unique (le client est sur chaque ligne) ; les commandes en cours vivent dans l'onglet Commandes. Les en-têtes de lot ne portent **pas** de montant : dans une période, un montant de lot mêlerait deux périmètres ; les montants d'un lot se lisent sur sa fiche (même fonction que la liste des lots et l'Accueil), ce qui supprime la divergence compta / détail lot relevée par l'audit. |
| Recherche client (`?q=`) affichée seulement au-delà de 6 groupes | **Simplifier** | Le champ reste monté tant qu'un filtre est actif (corrige la recherche qui disparaît quand elle réussit). |
| Graphe « Encaissé par semaine » | **Garder** | Même périmètre que la tuile Encaissé ; semaine calendaire lundi, Europe/Paris (§6). |
| Ticket (deep-link `?sale=`) : consultation, édition de lignes, lot, partage du reçu, suppression | **Garder** | L'édition de lignes réajuste stock et Trésorerie dans la même transaction ; l'historique des encaissements du ticket devient visible (ledger). |
| Export CSV comptable (BOM Excel, `;`) | **Garder** | Colonnes au vocabulaire canonique (plus jamais « CA »), périmètre identique à l'écran. |
| Vue Trésorerie : poches, transferts appariés, répartir le non-attribué, ajustement, paiement fournisseur | **Garder** | Plafonds serveur sur répartition et transfert (plus de poche négative silencieuse) ; renommer/archiver une poche gagne son UI (les actions existaient sans écran). |
| Journal des mouvements (30 derniers, net mensuel) | **Simplifier** | Pagination par mois : le net mensuel se calcule sur le mois complet, jamais sur un sous-ensemble. |
| « Importer l'historique » (backfill idempotent permanent) | **Abandonner** | C'était la rustine du couplage non transactionnel. Devient un script de migration one-shot (doc 07), pas un bouton d'écran. |
| Mouvements automatiques (vente, paiement, dépense) + réversibilité par origine | **Fusionner** | UN paiement ⇔ UN mouvement, créés **dans la même transaction** (l'infrastructure existait — `movements.ts` acceptait un client transactionnel jamais passé). La contre-passation devient systématique : annulation, suppression, remboursement. Règle : **compta et Trésorerie ne peuvent structurellement plus diverger.** |
| Poche système « Non attribué » (conservation de l'argent) | **Garder** | Excellente idée ; unicité garantie par contrainte en base (plus de doublon concurrent). |
| KPI serveur cachés par tags + dashboard MoneyBlock/AlertsBlock | **Garder** | Streaming par bloc, squelettes exacts, « rien à faire ⇒ rien rendu » : à reprendre à l'identique ; revalidation des caches systématique après toute écriture d'argent. |
| `BatchExpense.countInCompta` (champ mort au contrat jamais honoré) | **Abandonner** | Jamais lu ni écrit ; si un besoin « dépense hors business » émerge, ce sera une décision v2 explicite, pas un champ fantôme. |
| `CashMovementKind.OPENING` jamais émis, `renamePocketAction`/`archivePocketAction` non branchés, `pipelineCounts.dueAmount` sans consommateur | **Abandonner / brancher** | OPENING et dueAmount supprimés ; renommer/archiver branchés (ci-dessus). Rien ne reste « écrit mais jamais lu ». |

### 4.4 Lots

| Capacité (01 §3.4) | Décision | Justification |
|---|---|---|
| Liste Ouverts/Clos avec KPIs par lot (Encaissé, Marge nette, Marge %, À encaisser, dépenses) | **Simplifier** | Agrégé côté base (le chargement JS intégral de tous les lots disparaît). Une rangée porte **un** montant, la Marge nette du lot, et « À encaisser » en légende quand il y en a (ce qui appelle un geste) ; Encaissé, %, coûts d'achat et dépenses se lisent sur la fiche du lot, en 1 tap (tuiles fixes). Même fonction partout : aucun montant ne diverge. |
| Création (nom, date prévue, notes) → détail | **Garder** | `expectedAt` et notes redeviennent éditables après création. |
| Détail : renommage inline, clôture/réouverture, tuiles KPI, sections | **Simplifier** | La clôture verrouille aussi côté serveur (plus d'assignation à un lot clos par API) ; la grille de KPIs est stable (À encaisser ET coût d'achats, pas l'un ou l'autre). |
| Assignation en masse ventes / commandes (deux sheets jumelles ~240 lignes dupliquées) | **Fusionner** | Un seul sheet : il n'y a plus qu'un type de document. |
| Assignation unitaire (BatchPicker sur ticket et commande) | **Garder** | + rattachement dès la création (§5 N9). Un document conserve son lot en changeant d'état (corrige l'Encaissé du lot qui chutait à la finalisation — bug haute 01 §4.4). |
| Dépenses de lot (libellé, montant, poche → EXPENSE_OUT) | **Garder** | Transactionnel ; champ date (saisir une dépense d'hier) ; suppression confirmée (elle contre-passe un mouvement). |
| Suppression de lot protégée (409 si ventes) | **Garder** | Protection étendue : suppression refusée dès qu'un document (vente ou commande) est rattaché ou qu'une dépense a été saisie, même supprimée depuis (sa pièce contre-passée reste au journal) — on clôture le lot. Seul un lot créé par erreur, resté vide, se supprime ; aucune sortie d'argent ne peut donc devenir orpheline. |
| Intégrations dashboard / compta / Trésorerie, deep-links croisés | **Garder** | Mêmes montants partout (fonction partagée). |

### 4.5 Catalogue

| Capacité (01 §3.5) | Décision | Justification |
|---|---|---|
| Liste 3 onglets (Parfums / Marques / En avant), recherche, chips, état dans l'URL, deep-link `?stock=low` | **Garder** | Recherche insensible aux accents partout (comme les pickers). |
| CRUD parfum et marque, dédoublonnage de marques (`cleNom`), normalisation orthographique (`nommage.ts`) | **Garder** | `nommage.ts` et `resoudMarque` repris tels quels (doctrine « on ne recasse que ce dont on est sûr »). |
| Bascule de visibilité optimiste + rollback, verrous de publication en cascade | **Garder** | Gardes définies en UN endroit serveur, l'UI les consomme (plus trois formulations divergentes). |
| Mise en avant limitée à 2 emplacements | **Garder** | Contrainte vitrine ; exige désormais un parfum PUBLISHED (plus d'emplacement occupé par un invisible). |
| Upload d'images WebP (crop client, URL signée Supabase, auto-save après upload) | **Garder** | L'auto-save élimine le cas « image envoyée puis perdue ». Le crop portrait ne s'applique plus aux logos de marque (règle projet : jamais déformer un logo). |
| Grille tarifaire `PerfumePricing` par (parfum, volume) | **Garder** | Un seul geste d'enregistrement par fiche (plus de double bouton Enregistrer aux effets différents). |
| Suivi de stock (saisie, décrément vente, badges, alerte, filtre) | **Simplifier** | **« Non suivi » (null) devient distinct de « rupture » (0)** — supprime les fausses alertes massives (problème n°10) ; stock ajusté sur tous les chemins d'écriture, jamais négatif en silence. |
| Snapshot catalogue admin caché + invalidation coordonnée vitrine/admin | **Garder** | Contrat vitrine (01 §5) honoré tel quel : un point de lecture, un point d'invalidation. |
| Suppression = hard delete (parfum, marque en cascade) | **Simplifier** | Conservée (règle métier existante) mais l'historique est protégé : toute ligne de document conserve un snapshot (nom, marque, image), y compris les lignes catalogue — supprimer un parfum ne rend plus l'historique illisible. |
| `Perfume.isPrivate` (jamais écrit, promesse « exclu du public » non implémentée) | **Abandonner** | Champ à moitié construit, dangereux (fuiterait dès qu'éditable). Supprimé. |
| `ExternalImportSuggestion` (table entièrement morte) | **Abandonner** | Zéro usage code. Supprimée. |
| `Perfume.slug` « p-{id}-… » (unique, régénéré, jamais consommé par la vitrine) | **Abandonner** | Complexité sans lecteur ; la vitrine n'utilise que le slug de MARQUE (contrat 01 §5.1). |
| Endpoints REST sans appelant (GET `/api/admin/perfumes` liste, POST commandes legacy…) | **Abandonner** | Une seule pile ; aucune surface morte exposée. |
| Rôle VIEWER (lecture seule partielle, contournable) | **Abandonner** | Mono-opérateur (§1, §7). |

### 4.6 Accueil / Dashboard / Shell

| Capacité (01 §3.6) | Décision | Justification |
|---|---|---|
| Dashboard 6 blocs streamés (alertes, argent, pipeline, raccourcis, lots ouverts, top parfums) | **Garder** | Pattern exemplaire (Suspense par bloc, squelettes exacts). |
| Bloc argent hiérarchisé (Encaissé dominant, À encaisser / Trésorerie / Ce mois) | **Simplifier** | Encaissé du mois dominant (+ Marge nette du mois), tuiles À encaisser et Trésorerie ; total historique dans Compta › période « Tout » (arbitrage n°13 de 06). Deux « Encaissé » voisins à deux périmètres disparaissent : chaque chiffre est daté (§6). |
| Alertes conditionnelles (retard, non-attribué, stock) | **Garder** | Le lien d'une alerte ouvre exactement l'ensemble compté (une PENDING en retard comptée est visible dans la vue ouverte). |
| Pipeline commandes (compteurs + liens filtrés) | **Garder** | Compteur « en retard » = LA définition canonique (§6). |
| Raccourcis (Clients, Lots, Statistiques) | **Garder** | + Réglages (§5 N3). |
| Palette de commandes (recherche globale, navigation, création) | **Garder** | Sélectionner un parfum ouvre sa fiche en consultation, pas directement le formulaire. |
| Tab bar 5 onglets fixes, Vendre accentué, retour dérivé de la route (`navigation.ts` testé) | **Garder** | Invariant. La répartition fine des rattachements (Clients, Encaisser) est arbitrée dans `06-ECRANS-PARCOURS.md` — avec une règle : onglet actif et bouton retour racontent le même trajet. |
| Écran stats top-parfums (classement complet, limit 500) | **Simplifier** | Filtre de période + pagination ; `topBrands`/`topCustomers`/`dailyRevenue` (code mort serveur) non reconduits tels quels — réintroduits seulement s'ils gagnent un écran (v2, §5 N11). |
| Shell PWA : pull-to-refresh, UndoProvider 5 s, bannière d'installation iOS, SW + page offline, `ViewportSync` clavier | **Garder** | Les deux hooks viewport concurrents fusionnent en un seul service ; le pull-to-refresh attend la fin réelle du refresh. |
| Barre de progression factice (`AdminLoadingProgress`, 600 ms post-navigation) | **Abandonner** | Placebo assumé ; remplacée par un feedback de navigation réel (mécanismes de pending de Next). |
| Route fantôme `/admin/reglages` (câblée dans la navigation, sans page) | **Simplifier** | Tranchée en la créant pour de vrai : écran Réglages minimal (§5 N3). |

### 4.7 Auth / PWA / Infra

| Capacité (01 §3.7) | Décision | Justification |
|---|---|---|
| Connexion identifiant/mot de passe (bcrypt cost 12, hash factice anti-timing, JWT httpOnly 7 j) | **Garder** | Hygiène reconnue par l'audit, reprise telle quelle. |
| Middleware présence-seule du cookie ; server actions et pages sans aucune vérification | **Fusionner** | Remplacé par LE garde unique (§7) : vérification JWT partout, via un seul helper. |
| Rôles OWNER/EDITOR/VIEWER | **Abandonner** | Jamais réellement appliqués, inutiles en mono-opérateur. Un seul rôle implicite : le gérant. |
| Route logout orpheline / aucune déconnexion possible | **Simplifier** | Branchée sur l'écran Réglages (§5 N3). |
| `AuditLog` (write-only, jamais lu, `actorId` null sur les chemins vivants) | **Abandonner** | Un journal que personne ne lit ne protège personne. La traçabilité réelle est portée par les registres métier **visibles et append-only** : ledger de paiements et journal de Trésorerie. |
| Rate-limit login en mémoire de process | **Simplifier** | Backoff persistant simple (compteur en base sur `AdminUser`) — efficace en serverless, invisible à l'usage. |
| Sonde `/api/admin/health` + second secret `ADMIN_DASHBOARD_SECRET` | **Abandonner** | Vestige sans consommateur. |
| Création de compte par CLI uniquement | **Garder** | Mono-opérateur : aucune UI de comptes en v1. |
| Manifeste PWA dynamique, 12 splash iOS, icônes maskable, script sharp de génération | **Garder** | Enveloppe iOS très soignée, régénérée par `node scripts/build-admin-pwa-assets.mjs`. |
| Service worker (navigations network-first, repli `/admin/offline`, jamais d'API en cache) | **Garder** | Politique exemplaire ; version dérivée du build (plus de « v1 » figé), pré-cache de la page offline sans suivre une redirection de login. |
| Metadata admin (noindex, themeColor `#F2F2F7`, zoom autorisé) | **Garder** | Invariant identité (registre `product`). |
| En-têtes de sécurité absents | **Simplifier** | Ajout des en-têtes de base (§7) — une configuration, zéro coût d'usage. |

### 4.8 Socle de données (synthèse des décisions de modèle)

Matérialisées dans `03-MODELE-DONNEES.md` :

- **Fusionner** : un seul document de vente (cycle commande→livrée→soldée ou vente directe), un seul type de ligne (snapshot figé obligatoire : nom, marque, image, volume, prix, coût DZD, taux, don), un seul trio client (FK + snapshot, règle d'écriture unique).
- **Garder** : ledger de paiements append-only (généralisé), Trésorerie poches + mouvements signés (le sous-modèle le mieux conçu), `PerfumePricing` (PK composite), snapshots d'historique, `onDelete` SetNull pour l'historique, Decimal partout pour l'argent.
- **Simplifier** : FK réelles des mouvements vers leur origine (fin des `refType/refId` en chaînes libres et de leurs orphelins) ; UNE arithmétique monétaire (fin du mélange decimal.js / Prisma.Decimal / float) ; invariants portés par la base quand c'est possible (unicité poche système, montants ≥ 0, volumes) ; fuseau Europe/Paris explicite pour toutes les bornes temporelles ; un seul enum de statut de publication.
- **Abandonner** : `Sale.remainingDue`, `Order.depositPaid`/`depositAmount`, `Order.deliveredAt`, `PaymentTransaction.recordedById`, `Perfume.isPrivate`, `Perfume.slug`, `BatchExpense.countInCompta`, `ExternalImportSuggestion`, `AppSetting` (jamais lue — remplacée par un stockage de réglages minimal réellement branché : taux par défaut, poche par défaut), `AuditLog`.

### 4.9 Vitrine publique (contrat de lecture — 01 §5)

| Capacité | Décision | Justification |
|---|---|---|
| Lecture `Brand`/`Perfume` (champs, filtres de visibilité, cartes gammes COMPLETE, panneau Explorer) | **Garder intégralement** | Contrat dur : la vitrine n'est pas dans le périmètre mais lit les mêmes tables. |
| Invalidation `revalidateAdminCatalogue()` (tags `public-catalogue` + `admin-catalogue`) après toute mutation catalogue et toute écriture touchant le stock | **Garder** | Un point de lecture, un point d'invalidation — à reconduire tel quel. |
| Stabilité de `Brand.slug` (seul identifiant DB exposé dans les URLs publiques `?maison=`) | **Simplifier** | Renforcée : le slug ne change plus au renommage d'une marque (les liens partagés survivent). |
| `isFeatured` plafonné à 2, défense en profondeur des règles de visibilité (écriture ET lecture) | **Garder** | Les deux couches se protègent mutuellement. |
| Champs jamais lus par la vitrine (`stock`, prix, `Perfume.slug`, `isPrivate`) | — | Libres pour la refonte (décisions en 4.5/4.8) ; toute évolution du contrat serait documentée ici. |

### 4.10 Clients

| Capacité (01 §3.10) | Décision | Justification |
|---|---|---|
| Liste A–Z sectionnée, recherche URL, badge « X € dû », pagination cursor | **Garder** | Recherche réinitialise le cursor ; « Charger plus » ajoute au lieu de remplacer ; initiales accentuées bien sectionnées. |
| Création formulaire + création inline depuis commande/vente | **Garder** | La création inline sans quitter le formulaire est une force terrain. |
| Fiche : nom inline, 3 KPI, Appeler / WhatsApp / Snap, notes, historique avec reste dû | **Garder** | La tuile « À encaisser » de la fiche = LA définition canonique (§6), même fonction que l'écran Encaisser — fin des trois dettes différentes selon l'écran. L'historique inclut désormais toutes les opérations du client (la dualité disparue, plus de ventes invisibles). |
| Édition, suppression avec garde serveur + undo 5 s | **Garder** | Le refus serveur est expliqué à l'utilisateur (message réel, plus de générique) ; le dialogue dit la vérité (l'historique est conservé, détaché). |
| `CustomerField` partagé (fiche liée ou « client de passage, sans fiche ») | **Garder** | Modèle FK + snapshot assumé, avec une règle d'écriture unique. |
| Ardoise dérivée à la volée (jamais stockée) | **Garder** | Dérivée du ledger unique — plus de commandes annulées comptées « à encaisser ». |
| Champ WhatsApp client | **Garder** | La vitrine a retiré WhatsApp comme canal entrant ; le gérant, lui, contacte ses clients par où il veut. Recherche étendue à ce champ. |
| Saisie téléphone stricte E.164 (« +33… » à taper soi-même) | **Simplifier** | Normalisation automatique des formats français (« 06 12 34 56 78 » → `+33612345678`), à la saisie ET à la recherche. |

---

## 5. Nouveautés proposées

Absentes de l'existant, chacune économise des taps ou des oublis sur une tâche du §2. Coût : S (< 1 jour), M (1–3 jours), L (> 3 jours) à l'échelle du plan d'exécution.

| # | Nouveauté | Tâche servie | Ce que ça économise | Coût | Version |
|---|---|---|---|---|---|
| N1 | **« Reçu maintenant » à la vente** : montant reçu saisi (pré-rempli au total), le dû dérive du ledger ; plusieurs paiements possibles dès la création | Vendre à crédit (n°1) | Le parcours en deux temps « enregistrer payé puis corriger le reste dû » et les créances fantômes de la saisie inversée | S | v1 |
| N2 | **Poche d'encaissement par défaut** : dernier choix mémorisé côté serveur, pré-sélectionné partout (vente, acompte, encaissement), modifiable dans Réglages | Vendre, encaisser (n°1, 2, 5) | La ventilation à chaque vente et le second passage « répartir le non-attribué » | S | v1 |
| N3 | **Écran Réglages minimal** (`/admin/reglages`, rattaché à Accueil) : déconnexion, taux DZD par défaut, poche par défaut | Toutes (transverse) | Les constantes en dur (277), la route logout orpheline, la route fantôme de la navigation | S | v1 |
| N4 | **Récap de journée** : Encaissé du jour, ventes du jour, livraisons de demain, créances à relancer — 1 tap depuis l'Accueil, partageable (Web Share) | Bilan (n°9) | Le calcul de tête du soir et les oublis de livraison du lendemain | M | v1 |
| N5 | **Relances guidées** : dans Encaisser et sur la fiche client, créance ancienne → message pré-rédigé (récap du dû) à partager ou copier | Consultation du dû, encaissement (n°2, 6) | La rédaction du message de relance et l'oubli des vieilles dettes | S | v1 |
| N6 | **Récap client partageable** : ardoise + dernières opérations depuis la fiche (Web Share) | Consultation du dû (n°6) | La photo d'écran bricolée envoyée au client | S | v1 |
| N7 | **« Vendus récemment » en tête du picker parfum** | Vendre (n°1) | La recherche re-tapée pour les mêmes 10 références qui tournent | S | v1 |
| N8 | **Mémoire de prix apprenante** : chaque vente/commande met à jour `PerfumePricing` (dernier prix/coût/taux pratiqué), avec mention « dernier prix : X € » si l'on s'en écarte | Vendre, commander (n°1, 3) | La ressaisie du prix et les prix figés à la première saisie (bug `update:{}`) | S | v1 |
| N9 | **Lot dès la création** : champ « Lot » (replié, pré-rempli sur le lot ouvert le plus récent) sur les formulaires vente et commande | Suivi lot (n°8) | Le second passage systématique par le ticket ou le sheet du lot | S | v1 |
| N10 | **Notifications push** (iOS ≥ 16.4, PWA installée) : livraisons du jour, relances de créance | Suivi livraison, dettes (n°4, 2) | Les oublis quand l'app n'est pas ouverte | L | v2 |
| N11 | **Statistiques par période** : mois/semaine, tops marques et clients (ressuscite proprement les requêtes serveur mortes en les branchant sur un écran) | Bilan (n°9) | Rien d'indispensable au quotidien — d'où v2 | M | v2 |

Écartés volontairement (gadgets au regard du contexte §1) : raccourcis d'écran d'accueil iOS (non supportés par iOS pour les PWA), mode multi-devises d'affichage, tableau de bord configurable, scan de code-barres.

---

## 6. Vocabulaire canonique

Un même montant porte le même nom partout, avec UNE définition, calculée par UNE fonction serveur. Interdits reconduits : « CA », « bénéfice net », « prévision trésorerie », « panier moyen ». S'y ajoutent les arbitrages que l'audit imposait (trois « dûs », deux « en retard », deux « semaines », deux « CA », deux libellés du hors-catalogue).

| Terme | LA définition |
|---|---|
| **Encaissé** | Somme des paiements enregistrés (entrées moins remboursements) au ledger, **à la date du paiement**. Une période « voit » un encaissement le jour où l'argent entre — jamais rétroactivement à la date de la vente. |
| **À encaisser** | Somme, sur chaque document actif (commande confirmée ou livrée non annulée, vente), de **max(0 ; total du document − paiements nets du document)**. Le plafonnement se fait **par document** : un trop-perçu ici ne masque jamais une dette là. |
| **Marge nette** | Encaissé − coûts d'achat des lignes correspondantes − dépenses de lot. Toujours après dépenses, à toutes les échelles (globale, lot, période). Un chiffre avant dépenses ne s'appelle jamais Marge nette. |
| **Trésorerie** | Somme des soldes des poches actives (solde = solde d'ouverture + mouvements signés). Invariant structurel : chaque paiement crée exactement un mouvement, dans la même transaction — l'Encaissé d'une période est donc égal à la somme des mouvements de paiement client (nature `PAYMENT`, remboursements déduits) de la période (03 §5.2). Les autres mouvements de la Trésorerie (transferts, ajustements, dépenses, paiements fournisseur, contre-passations de dépenses) n'entrent pas dans l'Encaissé. |

**Le « dû » — définition unique (celle d'« À encaisser »).** L'audit en a relevé trois : (a) le pipeline du dashboard incluait les commandes PENDING avec un netting global non plafonné ; (b) l'écran Encaisser et la compta comptaient ventes à reste dû + commandes confirmées/livrées sans vente ; (c) la fiche client ne comptait que les commandes PENDING+READY. **Choix : la définition (b), généralisée au modèle unifié** — c'est celle de l'écran d'action, « ce que je peux réclamer aujourd'hui ». Justification : une commande **PENDING n'est pas une créance** (pas d'engagement — c'est l'acompte qui confirme) ; une commande **livrée impayée en est une**, et la plus urgente (la définition (c) l'ignorait, d'où des fiches client à 0 € pour des clients présents dans Encaisser) ; le netting global de (a) laissait un client trop-payé effacer la dette d'un autre. La fiche client, l'écran Encaisser, la compta et le dashboard appellent la même fonction.

**« En retard » — définition unique.** L'audit en a relevé deux explicites (liste : date de livraison < début du jour ; dashboard : < maintenant − 24 h) plus une troisième de fait (le libellé « Date de livraison dépassée » qui ne correspondait à aucune des deux pendant 24 h). **Choix : un document à livrer est en retard dès que sa date de livraison prévue est antérieure au début du jour courant (00:00, Europe/Paris) et qu'il n'est ni livré ni annulé.** Justification : un retard se rattrape le matin même — la tolérance de 24 h cachait l'alerte précisément quand elle était la plus utile ; le libellé redevient exact ; liste, alerte et pipeline partagent le même compteur, et le lien de l'alerte ouvre exactement l'ensemble compté.

**Règles temporelles associées** (ferment les divergences relevées) : toutes les bornes (« aujourd'hui », « ce mois », « semaine ») sont calculées en **Europe/Paris** ; la **semaine est calendaire et commence le lundi** ; **un chiffre de flux est toujours daté** (« Encaissé · septembre », « Marge nette · septembre ») : même définition, bornée à la période nommée — il n'existe plus de tuile « Ce mois » à côté d'un Encaissé non daté (arbitrage n°13 de 06). À encaisser et Trésorerie sont des soldes à date, jamais datés d'une période.

**Autres termes fixés** : « **Hors catalogue** » (jamais « Saisie libre ») ; « **Commande** » et « **Commandes** » partout — l'anomalie de nommage `ordres` de l'existant n'est pas reconduite dans le vocabulaire (la route cible est fixée par `04-ARCHITECTURE.md`) ; « **Offert** » pour un don ; « **Non attribué** » pour la poche système.

---

## 7. Sécurité (position explicite)

**Simple, invisible, suffisante.** L'app a un opérateur, sur son propre iPhone. La sécurité v1 tient en cinq points :

1. **Un garde unique, systématique.** Un seul helper serveur (vérification du JWT de session) appelé par **toutes** les pages RSC et **toutes** les server actions — le trou béant de l'audit (mutations et lectures accessibles avec un cookie forgé) est fermé par construction : dans la refonte, aucun chemin d'écriture n'existe hors de ce helper. Le middleware vérifie la signature du JWT en edge (jose y fonctionne) au lieu de la seule présence du cookie.
2. **Session unique, longue, révocable.** Login existant conservé (bcrypt, cookie httpOnly, 7 jours) ; déconnexion accessible dans Réglages. Pas de table de sessions, pas de 2FA, pas de « mot de passe oublié » (rotation par CLI).
3. **Pas de rôles.** VIEWER/EDITOR/OWNER supprimés ; un compte = tous les droits. Réintroduire des rôles serait un chantier v2 s'il y a un jour un second opérateur.
4. **Hygiène de base, une fois.** Rate-limit de login persistant simple, en-têtes de sécurité standards (HSTS, X-Frame-Options, nosniff) dans la config Next — une configuration écrite une fois, zéro coût d'usage.
5. **Rien de plus.** Pas d'audit log (§4.7), pas de gestion de comptes dans l'app, pas de chiffrement applicatif. La protection contre la perte de données n'est pas un sujet « sécurité » ici : elle est structurelle (principe 5 — transactions, contre-passations, registres append-only).

---

## 8. Anti-références

Ce que la refonte **refuse** — reprise actualisée de `docs/admin/PRODUCT.md`, enrichie des pathologies que l'audit a documentées.

**Héritées (toujours valables) :**

- Layout bureau multi-colonnes ou sidebar permanente.
- Typographie et luxe vitrine (serif Didot, or, fond charbon) dans le registre `product`.
- Jargon : « Assortiment », « Univers », « Sillage », « Maison ».
- Étapes implicites, formulaires sans feedback, spinners seuls sans squelette.
- `transition: all` sur les interactions tactiles ; gradients violet/bleu, néon, cartes dans des cartes.
- Copy creux : « Bienvenue sur », « N'hésitez pas », « Cliquez ici ».
- Deux formulaires concurrents pour la même tâche : un seul écran, champs facultatifs repliés.
- Deux systèmes de composants en parallèle : tout passe par `src/ui/*`.

**Nouvelles (tirées de l'audit — chacune a déjà coûté un bug) :**

- **Deux piles d'écriture pour la même entité** (server actions + REST), ou deux tables pour le même concept métier.
- **Un cache dénormalisé à plusieurs écrivains** : une donnée dérivable se calcule, ou n'a qu'un seul écrivain transactionnel.
- **Une écriture d'argent hors transaction** : mutation et mouvement de Trésorerie sont insécables, une annulation contre-passe toujours.
- **Un effet de bord destructeur dans une lecture** (la purge sur GET) : un GET ne modifie jamais rien.
- **Un champ, une table ou un paramètre « pour plus tard » sans lecteur** (`isPrivate`, `countInCompta`, `AppSetting`…) : ce qui n'est pas branché n'est pas livré.
- **Un commentaire qui promet ce que le code ne fait pas** : la doc mensongère est traitée comme un bug.
- **Une saisie inversée** (« ce qui restera dû ») : on saisit ce qu'on constate (l'argent reçu), jamais le complément.
- **Un synonyme de chiffre ou deux périmètres pour le même nom** : toute tuile passe par la fonction canonique du §6.
- **Un même écran avec deux signaux de hiérarchie contradictoires** (onglet actif ≠ retour) : la navigation raconte un seul trajet.

---

*Fin du document 02. Le document suivant (`03-MODELE-DONNEES.md`) matérialise la décision structurante du §4 (document de vente unique, ledger unique, FK réelles) en MCD puis MLD Prisma, avec la stratégie de migration des données existantes.*
