# Carnet fournisseur (dettes et versements)

**Décidé le 24/10/2026 avec le gérant.** Document amont du chantier : il fait foi pour la base, le
serveur et les écrans. Proposition validée : Claude Doc « Dettes fournisseur — proposition »
(rev 8). État du chantier et passation entre phases : `/mnt/project-files/dettes-fournisseur/ETAT.md`
(fichiers du projet, hors dépôt).

## Le besoin

Le gérant note aujourd'hui dans les notes de son iPhone ce qu'il doit au fournisseur, ce qu'il lui a
versé et ce qui reste. Il veut ce carnet **au propre dans Nuréa Gestion**, et une aide pour ne plus
recalculer à la main : cocher des commandes, des ventes ou des lots et lire leur coût total en dinars.

Le fournisseur se paie en dinars, sans règle fixe : en partie, le reste « pour la prochaine fois ».
D'où **un seul compte global** avec le fournisseur : un versement n'est en général rattaché à aucune
dette. **Exception (gérant, 25/10/2026)** : « Marquer remboursée » sur une dette note un versement du
même montant, daté maintenant, **lié à elle** (voir § Marquer remboursée).

## Ce que le carnet n'est pas

- **Pas de la compta.** Aucune ligne du carnet ne crée de `CashMovement`, ne touche une poche ni un
  chiffre (Encaissé, À encaisser, Marge nette, Trésorerie). Aucun fichier de `src/server/chiffres`
  ne lit ses tables.
- **Pas le « Paiement fournisseur » de la Trésorerie** (S15, `CashMovement` `SUPPLIER`, en euros).
  Celui-ci sort de l'argent d'une poche. Le gérant le fait à la main s'il veut refléter un versement
  dans sa caisse : deux gestes séparés, prix assumé de l'indépendance. Le carnet ne le déclenche pas.
- **Pas une pièce comptable** : une ligne se corrige et se supprime (filet « Annuler » 5 s).

## Règles

| Règle | Où elle est tenue |
|---|---|
| Une ligne est une **dette** (`DEBT`) ou un **versement** (`PAYMENT`), en dinars, montant > 0 | `supplier_entry_amount_ck`, contrat `recordSupplierEntryInput` |
| **Reste à payer = Σ dettes − Σ versements**, jamais stocké | `src/domain/supplier-debt.ts` (`supplierRemaining`) |
| Reste négatif = **avance** : affiché tel quel, jamais ramené à 0 | `supplierBalanceState` → `advance` |
| L'euro n'est qu'une **lecture au taux de l'écran**, jamais figée sur une ligne | `dzdToEur(montant, taux)` côté écran |
| Le taux du carnet est mémorisé à part : le changer ne change pas le taux proposé à la vente | `Setting.supplierExchangeRate` (NULL ⇒ `defaultExchangeRate`), `setting_supplier_rate_ck` |
| Une ligne ne se date pas dans le futur ; sans date, c'est maintenant | `valueDateOf`, writer |
| Les éléments cochés (documents, lots) ne vont que sur une **dette** | contrat |
| Un élément coché est un document **ou** un lot | `supplier_item_target_ck` |
| Supprimer un document ou un lot n'est jamais bloqué par le carnet ; seul le lien disparaît, la dette garde son montant | FK `ON DELETE CASCADE` sur `SupplierEntryItem` |
| Double tap = une seule ligne (identifiant fourni par le formulaire) | writer `recordEntry` |
| Seul un **versement** rembourse une dette, une dette n'est remboursée **qu'une fois** | `supplier_entry_settles_ck`, index unique `settlesEntryId`, writer `settleDebt` |
| Le montant d'un remboursement **suit celui de sa dette** ; il ne se corrige pas seul | writer `updateEntry` |
| Supprimer une dette emporte son remboursement : le Reste à payer ne bouge pas | FK `settlesEntryId` `ON DELETE CASCADE` |

## Données

Migration `20261024120000_supplier_ledger`, purement additive (deux tables neuves, une colonne vide).

- `SupplierEntry` — `kind`, `amountDzd` Decimal(10,2), `label` (nom libre : « Lot d'octobre »,
  « Transport »), `occurredAt`, `note`, `createdAt`, `updatedAt`.
- `SupplierEntryItem` — `entryId`, `documentId` xor `batchId`, `amountDzd` (coût en DA que le
  sélecteur affichait au moment de noter, ≥ 0). Sert à marquer « déjà noté » et à relire, sur la
  ligne, ce qui avait été coché.
- `Setting.supplierExchangeRate` — taux de lecture du carnet, DA pour 1 €.
- `SupplierEntry.settlesEntryId` (migration `20261025090000_supplier_settlement`, additive) — sur un
  versement, la dette qu'il rembourse ; NULL sinon.

## Serveur

| Fichier | Rôle |
|---|---|
| `src/contracts/supplier.ts` | Entrées (`recordSupplierEntryInput`, `updateSupplierEntryInput`, `deleteSupplierEntryInput`, `setSupplierRateInput`) et DTO de lecture |
| `src/server/supplier/writer.ts` | **Seul** écrivain de `SupplierEntry` et `SupplierEntryItem` (`table-ownership`) |
| `src/server/settings/writer.ts` | `setSupplierRate` : `Setting` garde un seul écrivain |
| `src/server/supplier/actions.ts` | `recordSupplierEntryAction`, `settleSupplierDebtAction`, `updateSupplierEntryAction`, `deleteSupplierEntryAction`, `setSupplierRateAction` |
| `src/server/supplier/queries.ts` | `getSupplierBalance` (Accueil), `getSupplierLedger` (E22), `getSupplierEntry(id)` (S22) |

L'en-tête de E22 et la rangée de l'Accueil lisent le Reste à payer par la **même** fonction : ils
disent toujours le même montant. Montants en chaîne de base (« 92700.00 »), relus par `dzdFromDb`.

Tests : `tests/db/supplier.test.ts` (gestes, refus, cascade, taux, et la preuve qu'aucun mouvement
d'argent n'est écrit), `tests/db/constraints.test.ts` (chaque CHECK), `src/domain/__tests__/supplier-debt.test.ts`.

## Écrans (phases 3 et 4)

**État au 24/10/2026** : phases 3 et 4 faites sur la branche `claude/project-thread-49b88r` (E22, S22
à S26, rangée de l'Accueil ; cas d'affichage dans `e2e/routes.ts`, carnet vide et sélecteur vide éprouvés
sur la base de PC-12). Rien sur `main` sans accord du gérant : la migration s'appliquera en production.

Vocabulaire d'écran : **Reste à payer · Dette · Versement · Fournisseur**. Jamais « crédit », « débit »,
« solde fournisseur ».

**E22 — Fournisseur · `/admin/fournisseur`.** Onglet Accueil, parent Accueil. On y entre par une
rangée de l'Accueil « Fournisseur · Reste à payer 48 300 DA », à côté de « Réglages ».

1. En-tête : Reste à payer en DA, ≈ en €, le taux (toucher pour le changer → S26). Rien à payer :
   « Rien à payer ». Avance : « Avance de 500 DA ».
2. Deux boutons : « Noter une dette » (→ S25 le sélecteur, avec le raccourci « Saisir à la main »
   → S23) et « Noter un versement » (→ S24). Un seul bouton primaire : « Noter une dette ».
3. Le carnet, du plus récent au plus ancien : date, nom, montant en DA et en €. Dettes et versements
   bien distincts (sens et libellé, pas seulement la couleur). Toucher une ligne → S22.

**Sheets.** Adressables : S22 et S25 (paramètres `ligne`, `selection`), à déclarer dans
`SHEET_PARAMS` de `src/app-shell/routes.ts`. Les autres sont transitoires.

| Sheet | Contenu |
|---|---|
| S22 Ligne du carnet · `?ligne=<id>` | Détail, note, éléments cochés (client ou lot, coût noté), « Modifier », « Supprimer » avec « Annuler » 5 s (`UndoProvider`) |
| S23 Dette à la main | Montant DA (≈ € en direct), nom, date (aujourd'hui), note |
| S24 Versement | Montant DA pré-rempli avec le Reste à payer (paiement complet en un tap), date, note |
| S25 Sélecteur · `?selection=1` | Documents non annulés (en attente compris) et lots ; recherche (client, parfum, nom du lot — c'est elle qui filtre par lot) ; cocher un lot coche ses documents ; bandeau fixe « 3 éléments · 92 700 DA · ≈ 334,65 € » ; déjà notés grisés avec le nom de leur dette, cochables quand même ; lignes sans coût signalées et comptées à part (« dont 2 lignes sans coût ») ; « Noter cette dette » → montant modifiable, nom pré-rempli « Dette du 24 oct. » |
| S26 Taux du carnet | Un champ taux ; enregistre par `setSupplierRateAction` |

**Coût d'un élément (S25).** Σ `quantity` × `unitCostDzd` des lignes du document, lignes sans coût
exclues et comptées ; un lot = Σ de ses documents non annulés. Une requête, `src/server/supplier/sql.ts`,
lue par le sélecteur ET par `recordEntry` : **le serveur recalcule** le coût de chaque élément coché au
moment d'écrire, l'écran n'envoie que des identifiants. Parité au centime avec la relecture d'achat de
E06 (`purchaseDetail`) sur son périmètre, les documents engagés : `tests/db/supplier.test.ts`.
Écart voulu : le sélecteur compte aussi les commandes **en attente** (c'est ce qu'on fait préparer au
fournisseur) ; la tuile de E06 ne compte que les engagés.

Un lot coché en entier part comme **un** lot (S22 le relit « Commande de mars ») ; un lot en partie
coché part document par document. Un document « déjà noté » l'est directement ou par son lot ; il reste
cochable (deux dettes pour une même commande, un réassort par exemple). Liste servie par la page,
plafonnée à 1 000 documents (le reste se dit « N affichés sur M »), dessinée 50 par 50 (« Afficher plus »).
Un document annulé entre l'ouverture et l'envoi : refus `NOT_FOUND`, rien d'écrit.

## Marquer remboursée (décidé le 25/10/2026)

Dans S22, une dette non remboursée porte le bouton primaire **« Marquer remboursée »**
(`settleSupplierDebtAction`). Il note un **versement** du montant de la dette, daté maintenant,
`settlesEntryId` = la dette. Le Reste à payer reste Σ dettes − Σ versements : il baisse d'autant.
**Aucun `CashMovement`**, aucune poche : le gérant reflète lui-même le paiement en Trésorerie s'il le
veut (`tests/db/supplier.test.ts` le prouve).

- Le carnet affiche la dette « Dette remboursée » et le versement « Remboursement » (nom par défaut).
- S22 d'une dette remboursée : « Remboursée le 25 octobre 2026 », puis **« Annuler le
  remboursement »** (supprime le versement, filet « Annuler » 5 s).
- S22 d'un remboursement : la dette remboursée, touchable ; son montant est en lecture seule.
- Second geste (double tap, deux écrans) : le versement existant est rendu, jamais deux.

## Choix à reprendre si le besoin change

- Remboursement **entier** seulement : un versement partiel reste un versement libre, sans lien. Si un
  jour le gérant veut suivre dette par dette avec des acomptes, il faudra une table de lettrage.
- Le montant de la dette reste celui que le gérant valide (pré-rempli par la somme, modifiable) : la
  somme des éléments cochés n'est pas imposée, elle aide.
- Carnet non paginé (`shortcut` dans `queries.ts`) : à paginer au-delà de quelques centaines de lignes.
