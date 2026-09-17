# Amendements en attente de report dans les docs 02–07

Fichier de travail : chaque bloc est à reporter dans le document cité, puis retiré d'ici.
Quand le fichier est vide, il est supprimé. (Une documentation qui ment est un bug.)

## Depuis J7 (chiffres) — 17/09/2026

1. **04 §6.2, API** — arguments simples (pas d'objet), pour la clé de cache de §8.4 : `encaisse(periode = "all", batchId = null, customerId = null)`, `aEncaisser(batchId, customerId)`, `margeNette(periode, batchId)`, `documentBalance(...ids)`. La période voyage comme une clé texte (`src/contracts/chiffres.ts`) : `all`, `month`, `month@AAAA-MM-JJ`, `month-1`, `<instant ISO>/<instant ISO>` ; `periodFromParams({ periode, ref })` lit l'URL.
2. **04 §6.2 et §6.6 ; 06 E03 zone 3** — `encaisseParSemaine(8)` devient `encaisseSerie(periode)` : par jour pour une semaine (et un jour), par semaine pour un mois, par mois pour une année et pour Tout ; chaque point est coupé aux bornes de la période et la somme des points égale l'Encaissé ; Tout va du mois du premier paiement au mois courant ; un intervalle libre est refusé.
3. **04 §6.2, ajouts** — `encaisseParPoche(periode)` (E02) ; `coutACompleter(periode, batchId)` (compteur E01, filtre E03, S19) ; `documentsDeLaPeriode(periode)` (E03 zone 5, A-7) ; `margeNette` rend aussi `encaisse` et `unknownCostCount` (S19) ; `tresorerie(fraicheur: "cache" | "instant")` (« instant » pour les formulaires, 04 §10.4) ; `chiffresParLot(periode = "all")` rend `{ batchId, encaisse, aEncaisser, margeNette }` (sans compteur de documents, laissé à J13) ; `aEncaisserParClient()` ne couvre que les fiches liées.
4. **04 §6.3** — chiffres de `tableauDeBord()` en une requête ; alertes de stock lues en parallèle depuis `catalogue.stockAlerts()` sous leur propre cache ; le composite rend aussi `stock` et `month` (bornes du mois compté). **À trancher en J14** : le bloc « Aujourd'hui » de E01 (Encaissé du jour, ventes et commandes du jour, à livrer aujourd'hui/demain) n'est pas dans le composite ; les compteurs « à livrer » dépendent du filtre de J8.
5. **04 §6.5** — « maintenant » = horloge du serveur passée au SQL, qui calcule les bornes en Europe/Paris ; la clé de cache du jour et les bornes SQL partagent une seule horloge.
6. **03 §5.5** — ordre des poches : `isSystem, sortOrder, name, id` (« Non attribué » en dernier).
7. **03 §5.8** — clé de regroupement des créances : `fiche:<customerId>`, sinon `nom:` + lower(btrim(nom saisi)) (ignore casse et espaces autour, pas les accents) ; `ageDays` et `isOld` calculés en SQL.
8. **04 §6.2 ; 06 E01 zone 6** — compteurs « en attente / confirmées » = `origin = 'ORDER'` seulement (comme E10) ; `enRetard` ne filtre pas l'origine (03 §5.6).
9. **07 J7 et J8** — la requête de première page des commandes n'existe pas encore : `perf.test.ts` mesure une forme représentative ; à J8, « perf.test.ts importe la requête de `documents/queries.ts` ».
10. **04 §17.3 ; 07 §2.5** — `--chiffres` fonctionne sans `--conditions=react-server` (le script neutralise `server-only`) ; `--rapport <rapport.json>` sort en 1 si C1, C3, C4 ou le non attribué diffèrent ; n'affiche que des agrégats.
11. **04 §15** — le volume de `perf.test` vaut 10 × le réel, plus 30 dépenses (la copie réelle n'en a aucune).
12. **04 §6.6** — la note « `activePockets` répète le SQL de solde (pour J7) » est résolue : `activePockets` lit `tresorerie("instant")`.

## Depuis J11 écrans (catalogue) — 17/09/2026

1. **06 E16 actions secondaires** — « Dupliquer » est un bouton visible à côté de « Modifier » (pas de menu « ⋯ » : aucune brique de menu, et un tap de moins).
2. **06 E16 zone 4** — « Aucun tarif mémorisé » sans lien « Modifier » (second chemin vers le même écran, 05 §5.3).
3. **06 E16 zone 1** — visuel principal (sombre) + mention « Variante claire enregistrée » si une variante claire existe ; pas de bascule clair/sombre (admin light only).
4. **06 E15 zones 2–3** — l'en-tête épinglé porte titre, onglets et recherche ; les chips à compteur et « + Parfum » / « + Marque » sont en tête de liste sous « N parfums » ; catalogue vide ⇒ le bouton disparaît, l'état vide porte l'action.
5. **06 §1.2, paramètres E15** — ajouter `gamme=complete` (chip « Gammes complètes »).
6. **06 §1.5 (note J4)** — le retour traite un paramètre absent comme sa valeur par défaut (catalogue `tab=parfums`, commandes `vue=a-livrer`, compta `vue=ventes`/`periode=mois`, vendre `mode=vente`) ; « Catalogue » depuis une fiche parfum restaure `/admin/catalogue?q=…&stock=…` et son défilement (F-4.5-08).
7. **06 S20 ; 05 §3.1 `Sheet`** — règle : **une sheet de saisie courte met son bouton dans le corps, pas en pied** (avec un pied, 320 px clavier ouvert laissait 59 px de contenu). S01 et S02 (J8) échouent au même contrôle (24–72 px) : à corriger selon cette règle.
8. **05 §3.1 Input** — clavier ouvert, un champ focalisé est centré dans la partie visible de l'écran (et non l'écran entier).
9. **06 S05 mode marques** — « Créer la marque « X » » ouvre une étape « Utiliser cette marque » (un tap de plus) ; la marque est créée avec le parfum. Notice de sheet : « {Marque} est déjà au catalogue : touche-la pour la choisir, aucune marque en double ne sera créée. » ; notice du formulaire : « Rattaché à Louis Vuitton, déjà au catalogue. »
10. **06 E17 zone 2** — notice « Louis Vuitton existe déjà. Ouvrir » ; en création, le bouton devient « Ouvrir Louis Vuitton ». L'interrupteur « Visible » est un champ du formulaire enregistré par « Enregistrer » (pas une écriture immédiate).
11. **06 E16 zone 7** — la visionneuse a aussi « Avant / Après » (ordre) et l'édition du libellé. Messages de dépôt : « 2 visuels ajoutés », « Aucun visuel ajouté · 1 refusé : format illisible ».
12. **04 §12 ; 07 J11 `image-convert` ; CLAUDE.md « WebP obligatoire »** — iOS Safari ne sait pas encoder le WebP. **Décision (17/09/2026) : conversion WebP côté serveur** (`sharp`) : le téléphone envoie l'original sur un chemin temporaire signé par le serveur, une action serveur le convertit en WebP (logo : sans recadrage ; parfum : portrait ; story : plafonné à 1920 px sans recadrage), écrit le chemin définitif, puis supprime le temporaire. **À implémenter** (le repli PNG/JPEG actuel de `image-convert.ts` est provisoire).
13. **05 §2.1** — nouveau jeton `--admin-viewer-backdrop: rgba(10, 8, 9, 0.94)`.
14. **06 E19 et S18** — la suppression ajoute « Tu pourras annuler pendant 5 secondes. » ; « Masquer plutôt » seulement si le parfum est visible ; « Abandonner la saisie ? » par interception des liens dans la feature (à terme : garde de navigation du shell, 04).
15. **06 E15 zone 5** — un 3ᵉ « En avant » est refusé sur l'appareil avec le message du domaine, avant tout appel serveur.
16. **06 E16 zone 5** — nom accessible de la rangée de stock : « Ajuster le stock ».
17. **04 §7.3 `storage-orphans`** — compte `SaleLine.imageUrl`, ignore les objets de moins de 24 h (`--min-age-hours`), refuse base et bucket de projets différents, exige `--confirm-storage-host` pour la production ; ajouter le script npm `"storage:orphans": "tsx scripts/storage-orphans.ts"`.
18. **04 §16.4** — le global-setup e2e purge le cache de données de Next ; les identifiants du jeu e2e ont la forme cuid ; stockage simulé par un faux serveur Supabase local (`e2e/support/fake-storage-server.ts`, loopback uniquement).
19. **Code** — `src/server/catalogue/writer.ts` (`unreferencedObjectUrls`) lit encore `PerfumeMedia` en SQL brut : passer au client Prisma.
20. **e2e vitrine** — `e2e/catalog-filters.spec.ts` attend encore le lien WhatsApp retiré par `f84b6ed` : mettre le test à jour (Snapchat seul canal).

## Code (petits restes hors périmètre des agents)

- Exemples « 100 ml » périmés : commentaire `src/server/documents/writer.ts` (~l.102), commentaire `src/ui/primitives/Stepper.tsx` (~l.13), attente du test `src/lib/__tests__/share.test.ts:24` (vérifier si c'est un texte vitrine légitime avant de changer).
- `src/contracts/catalogue.ts` : commentaire de `PerfumeSheet.activity` à préciser « unités ».
- 04 §9 : `UNAVAILABLE` pour une panne du stockage (aujourd'hui `UNEXPECTED`).
- CI : ajouter le job `layout` à `.github/workflows/refonte.yml`.
