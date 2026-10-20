# Équipe — le fil conducteur commun

**Toute session Claude qui travaille sur le projet Nuréa Parfums lit ce fichier au démarrage** (ce
dépôt et ses worktrees, la page du graphiste ; les autres projets du gérant ne sont pas concernés), avant sa propre
tâche. Il dit qui fait quoi, ce que chacun a le droit de toucher, comment on se passe le travail et
comment on rend compte au gérant. Il est tenu par le **pilote** (§ 2). En cas de conflit avec un
document de chantier, ce fichier gagne sur l'organisation ; `CLAUDE.md` gagne sur les règles
techniques.

Mis en place le 20/10/2026 à la demande du gérant : « toute l'équipe travaille sur le même fil
conducteur et tout le monde a conscience de tout le monde ».

## 1. Ce qui compte, dans l'ordre

1. **Ne rien casser en production** : base (elle tient l'argent), référencement, vitrine en ligne.
2. **La refonte de la vitrine** (DA « Nuancier nocturne », `docs/refonte-vitrine/`) jusqu'à sa mise
   en ligne (T23).
3. **Les visuels du catalogue** : chaque parfum publié avec son visuel sombre (et clair si possible).
4. La gestion (`app/admin`) : en production depuis le 22/09, **aucun chantier ouvert** ; correctif
   seulement à la demande du gérant.

Quand deux chantiers se gênent, l'ordre ci-dessus tranche, et le pilote arbitre (§ 6).

## 2. Qui fait quoi

| Chantier | Session | Touche | Ne touche jamais | Écrit en production ? | Document pilote |
|---|---|---|---|---|---|
| **Pilotage** | session « refonte vitrine », planificateur (Fable pour la DA, Opus pour exécuter) | ce fichier, `docs/refonte-vitrine/`, arbitrages | — | non (décide, ne déploie pas seul) | ce fichier |
| **Refonte vitrine** | même session, branche `refonte/vitrine`, worktree `.claude/worktrees/refonte-vitrine` | `app/(shop)`, `src/components`, `app/globals.css`, `src/design/{brand,fonts}.ts`, `tailwind.config.ts`, `scripts/refonte-vitrine/`, colonnes `ambientHue`/`ambientChroma` | gestion ; `image`, `imageLight`, `status` des fiches ; l'artefact du graphiste | non avant T23, sauf la migration d'ambiance (§ 4.3) | `docs/refonte-vitrine/00-LISEZ-MOI.md` |
| **Visuels et page du graphiste** | session « visuels » (conversation de l'artefact) | `.tmp/outils-visuels/`, `.tmp/audit-visuels/`, l'artefact `https://claude.ai/artifact/UA62cGXzx3QiB62RKLAE6Y`, Storage `perfumes/*`, champs `image`/`imageLight`/`status` des fiches, `scripts/catalogue/`, les clés de cache de `src/lib/catalogue-service.ts` | le style de la vitrine, la gestion, les migrations | oui, sur `main`, fournée par fournée | mémoire `visuels-boite-a-outils.md` (à versionner, § 7) |
| **Gestion** | aucune session ouverte | `app/admin`, `src/features`, `src/ui`, `src/app-shell`, `src/server` | — | sur demande du gérant seulement | `PASSATION.md`, `docs/refonte/` |

Une nouvelle session qui ne sait pas où elle se range : elle le demande au gérant **avant** d'écrire,
et le pilote ajoute sa ligne ici.

## 3. Règles communes à toutes les sessions

- **Au démarrage** : `git fetch`, comparer à `origin/main`, lire le § 8 (journal) de ce fichier.
- **Base** : `.env` et `.env.local` pointent sur la **production**. L'URL se lit avant l'import de
  Prisma ; la production exige `--confirm-host` ; tout script qui écrit journalise l'ancienne
  valeur **avant** d'écrire (retour arrière). Jamais `prisma db push`, `prisma migrate reset`, ni
  `npm run build` tel quel.
- **Git** : `git add` fichier par fichier ; un commit = une unité de travail ; sujet
  `<chantier>(<tâche>): …` en français (`vitrine(T7): …`, `visuels(f11): …`) ; le corps dit ce qui a
  été **vérifié, en chiffres** ; fin par la ligne `Co-Authored-By` de la session. Pousser sur `main`
  = mettre en ligne.
- **Fichiers partagés** (risque de conflit) : `src/lib/catalogue-service.ts` (clés de cache),
  `src/lib/catalog/demo-catalogue.json`, `CLAUDE.md`, `MEMORY.md`. Toute modification d'un de ces
  fichiers laisse une ligne au journal (§ 8).
- **Secrets** : jamais dans un fichier, ni du dépôt ni de `.tmp/`. Une session qui en trouve un le
  signale au gérant sans le recopier.
- **Données** : rien d'inventé (ni note, ni famille, ni avis, ni rareté) ; **le nom fait foi** ; une
  fiche fausse est pire qu'une fiche manquante.
- **Vitrine** : Marque · Parfum · Ligne · Catalogue ; **aucune contenance affichée**, jamais de prix.

## 4. Contrats entre chantiers

### 4.1 Visuels → vitrine

Un visuel livré en base est : WebP **1024 × 1536** (2:3), variante **sombre obligatoire** dans
`image`, variante **claire facultative** dans `imageLight` (même scène, seule la lumière change),
vignette **`-640.webp`** à côté. Fiche en `DRAFT` tant qu'aucun visuel validé ne remplace la photo
du flacon d'origine (fond blanc). La vitrine ne lit que ces champs ; elle ne les écrit jamais.

### 4.2 Vitrine → visuels

La refonte ne change pas le format des visuels. Elle ajoute une **couleur d'ambiance** par parfum,
calculée sur le visuel sombre (`scripts/refonte-vitrine/ambiance.mjs`). Après la mise en ligne de la
refonte, chaque fournée se termine par :

```
npx dotenv -e .env -- node scripts/refonte-vitrine/ambiance.mjs --confirm-host <hôte> --ids <ids>           (essai à blanc)
npx dotenv -e .env -- node scripts/refonte-vitrine/ambiance.mjs --confirm-host <hôte> --ids <ids> --apply   (écriture, journalisée)
```

Un flacon sans couleur (noir, argent, transparent, fond blanc) donne « repli » : normal.

### 4.3 Base

Une seule migration attendue d'ici T23 : `20261020120000_perfume_ambient` (deux colonnes vides,
sans risque). Elle part sur `main` **seule**, au point de contrôle 2, pour que l'ambiance puisse
être écrite avant la refonte. La session visuels n'écrit que des données, jamais de schéma.

### 4.4 Clés de cache

La session visuels monte les clés sur `main` comme aujourd'hui et le note au journal. La branche
`refonte/vitrine` porte `public-catalogue-v20` ; à la fusion (T23), elle prend **le numéro au-dessus
de celui de `main`**. À T23, la refonte propose une clé unique, pour qu'il n'y ait plus trois
numéros à monter ensemble.

## 5. Rendre compte au gérant (format commun)

Le gérant n'est pas développeur. Chaque rendu, **8 lignes au plus** :

1. **Fait** : quoi, en mots simples (commit si code).
2. **Vérifié** : les chiffres (tests, nombres de fiches, captures).
3. **Ce que tu dois faire** : une action précise (regarder telle capture, répondre oui/non à telle
   question, générer telle image avec tel prompt), ou « rien, je continue ».
4. **Ensuite** : la prochaine étape.

Pas de jargon, pas de tableau de décisions à valider : les choix techniques se tranchent par la
session, les choix de goût par le gérant.

## 6. Arbitrage

Conflit entre chantiers, doute sur le périmètre, fichier partagé touché par deux sessions : on
**s'arrête**, on écrit la question au journal (§ 8, « Question »), on prévient le gérant en une
ligne. Le pilote tranche et écrit la décision au même endroit. Une question de goût sur la DA va à
une session Fable (effort high) avec `docs/refonte-vitrine/04-PLAN-EXECUTION.md`.

## 7. Décisions du pilote pour la session visuels (20/10/2026)

Sa chaîne marche et produit : on n'en change pas le fond. On corrige ce qui la rend fragile.

| # | Décision | Pourquoi | Échéance |
|---|---|---|---|
| V1 | **Versionner les outils réutilisés** : `.tmp/outils-visuels/` → `scripts/visuels/` (convert, apply, publier, comparer, page), un commit par outil, avec un en-tête « usage » comme `scripts/catalogue/*`. Les scripts à usage unique (`_f8-*`, `_f9-*`) restent dans `.tmp/`. | `.tmp/` est hors git et local : un nettoyage ou un autre poste efface la chaîne, et une autre session la réécrirait de zéro. | avant T23 |
| V2 | **Sauvegarder la source de la page** (`data.json`, gabarit, modèle de prompt) dans `docs/visuels/` à chaque publication de l'artefact. | C'est la seule copie de 552 fiches de travail. | à la prochaine publication |
| V3 | **Une ligne au journal (§ 8) par fournée** : date, ids appliqués, ids publiés, clés de cache montées, commit. | La refonte doit savoir quels visuels ont changé (ambiance, captures). | dès maintenant |
| V4 | **Découper sa mémoire** : un fait par fichier (outils, page, règles de jugement, assets). | Un seul gros fichier se relit mal et finit par se contredire. | quand il la met à jour |
| V5 | **Rendre compte au format du § 5.** | Même fil pour le gérant. | dès maintenant |
| V6 | **Supprimer `.tmp/PROMPT-PASSATION.md`** (il contient des valeurs qui ressemblent à des clés) et faire vérifier par le gérant si ces clés sont réelles. | Un secret ne vit dans aucun fichier (§ 3). | dès maintenant |
| V7 | Style des scènes : **inchangé** jusqu'au point de contrôle 2. Les cartes de la refonte seront jugées avec les vrais visuels ; si les scènes dorées écrasent la couleur du flacon, le pilote rédigera une consigne de scène commune. | Constat du 20/10 : 41 % des ambiances tombent dans l'ambre/or (scènes très dorées), le reste suit bien la couleur du flacon. | PC 2 |

## 8. Journal (le plus récent en haut, une ligne par événement)

| Date | Chantier | Événement |
|---|---|---|
| 20/10 | pilotage | Création de ce fichier. Décisions V1 à V7 pour la session visuels. |
| 20/10 | refonte | T5 (coque) et T6 (jeu d'essai) sur `refonte/vitrine`. T7 en cours : colonnes d'ambiance (migration `20261020120000_perfume_ambient`, pas encore en production), clé `public-catalogue-v20` sur la branche. Essai à blanc sur 233 fiches publiées : 34 en repli (14,6 %), dont les ~50 photos de flacon d'origine sur fond blanc (visuels à venir). |
| 20/10 | visuels | Fournée 10 appliquée. Clés sur `main` au 20/10 : `public-catalogue-v19`, `seo-catalogue-v15`, `unlisted-perfumes-v9`. |
