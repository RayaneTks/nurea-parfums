# Prompt — session Fable : accueil, troisième passage (après refus de l'accueil codé)

À coller dans une session neuve (Fable, effort high), après `/clear`. Origine : le 21/10/2026, le
gérant a vu l'accueil **codé** (T15, composition A « Couverture », `refonte/vitrine` `3492c18`) et
répond : « la hero section et tout ce qui est au-dessus du catalogue, donc la page d'accueil, c'est
ultra cheap pour un site de parfum catalogue ». Remarque de goût → Fable (04-PLAN-EXECUTION § E).

C'est le **troisième refus** de l'accueil : planche v1 (`cee4774`, « beaucoup trop cheap »), planche v2
(A choisie avec la réserve « très simple, bof », B « trop chargée »), puis A codée. Refaire une
variation de A serait refaire la même erreur.

---

Reprendre **tel quel** le cadre de `PROMPT-FABLE-ACCUEIL.md` (lecture, livrables, contraintes, règles
de travail), avec ces changements :

## Avant tout dessin : les références du gérant

Le gérant n'a jamais pu dire ce qu'il veut, seulement ce qu'il refuse. **Première action** : lui
demander, en une question simple, 2 ou 3 sites (parfumerie, mode, beauté, peu importe) dont la page
d'accueil lui paraît « haut de gamme », et ce qui lui plaît dans chacun. Les regarder (navigateur
intégré), en tirer ce qui est commun (échelle d'image, densité, typographie, mouvement). Sans réponse
de sa part, ne pas avancer au hasard : attendre.

## Ce qui a été refusé (à lire, puis à ne pas refaire)

- L'accueil codé : aperçu https://nureaparfums-git-refonte-vitrine-rayanetks-7861s-projects.vercel.app/
  et captures `.tmp/refonte-vitrine/t15/` du worktree `refonte-vitrine` (`accueil__*`,
  `accueil-premier-ecran__mobile__*`). Composition : H1 en `display` sur fond uni + ligne de faits ;
  deux bandeaux bord à bord à l'ambiance (marque, nom, visuel 2:3) ; index de 8 marques au filet ;
  catalogue.
- Les planches v1 et v2 sur `refonte/planche` (`accueil.html`, `accueil-v2.html`).

## Hypothèses sur le « cheap » (à juger, pas à recopier)

- **Les interdits de § B.10 sont peut-être la cause** : ouverture sans image, sans bouton, sans texte
  sur photo → un titre seul sur un aplat, ce que font les gabarits gratuits. Le gérant a validé les
  visuels et la fiche (PC 1–3) : ce qui plaît, ce sont les scènes en grand. Rouvrir la question d'une
  ouverture **image d'abord** (scène plein écran, pas une photo assombrie avec deux boutons), du
  logotype ou du monogramme en grand, d'un texte éditorial court qui dit ce qu'est Nuréa.
- **Bureau** : les bandeaux sont de grands aplats de couleur avec un petit nom isolé, beaucoup de vide
  sans intention.
- **Index des marques** : une liste d'annuaire ; aucune marque n'y est montrée (ni logo, ni flacon).
- **Aucun mouvement** à l'arrivée (prévu en T18) : une page premium se juge aussi au mouvement ; la
  planche doit le montrer cette fois.
- Rien ne dit « parfumerie » plutôt que « catalogue » : ni matière, ni lumière, ni rythme éditorial.

## Ce qui reste acquis (ne pas défaire)

Barre haute et recherche, catalogue (grille, filtres, fiche en feuille, Ma sélection), DA (jetons,
Fraunces + Figtree, deux thèmes, ambiance), H1 « Nuréa Parfums » + « Marseille », Snapchat en
4 taps au plus, données vraies seulement, budget LCP ≤ 2,5 s (mesuré à 1,8 s / 2,0 s avec un visuel
640 au premier écran : un visuel plus grand doit dire son poids). Le code de T15
(`Hero.tsx`, `FeaturedSection.tsx`, `BrandIndex.tsx`) sera réécrit par l'exécutant selon la nouvelle
composition ; ses mécanismes techniques (ouverture de fiche par événement, préchargement par thème,
`content-visibility` des cartes) se réutilisent.

## Livrables

Comme `PROMPT-FABLE-ACCUEIL.md` (diagnostic, composition chiffrée dans § B.10 et `DESIGN.md`, planche
`accueil-v3.html` avec deux compositions franchement différentes **et leur mouvement**, question A/B
au gérant sur téléphone), puis `PROMPT-SUITE-T15.md` réécrit pour l'exécutant.
