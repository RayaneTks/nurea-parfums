# Alignement des variantes claire et sombre — relevé du 21/10/2026

Le gérant a constaté que des images « bougent » quand on bascule entre clair et sombre. **Cause : les
fichiers, pas le CSS.** Les deux variantes s'affichent dans la même boîte, avec les mêmes `object-fit` et
`object-position`, sans transition de position (`PerfumeImage`, `Hero`, `BrandLogo`) ; les logos ivoire et
noir ont la même taille et la même boîte opaque au pixel. Mais, dans beaucoup de paires, **le sujet n'est
pas au même endroit dans les deux fichiers** : le contrat des visuels (`docs/EQUIPE.md` § 4.1, « même scène,
seule la lumière change ») n'est pas tenu. Aucun réglage CSS ne corrige proprement un fichier décalé : il
faut refaire la variante (même cadrage que la sombre).

## Méthode

`.tmp/refonte-vitrine/t15/alignement.mjs` (worktree `refonte-vitrine`) : contours (Sobel) des deux
vignettes 640, réduites à 320 px, puis recherche du décalage (± 14 px réduits) qui maximise leur
corrélation ; résultat ramené en pixels du fichier 1024. Pas de 3 px environ ; sous 6 px, l'écart n'est pas
significatif. Contrôle à l'œil sur les trois pires (Party Love, Pasha de Cartier, La Nuit de L'Homme) :
confirmé — pour Pasha, le flacon n'a ni la même taille ni la même place.

## Résultat (catalogue de démonstration : 103 paires)

44 paires alignées, 30 à moins de 4 px (non significatif), **29 décalées de plus de 6 px**, ci-dessous.
Le catalogue de production (233 fiches) n'a pas été mesuré : relancer le script sur la liste de production
(lecture seule) avant de refaire.

| # | Marque | Parfum | Décalage (px, fichier 1024) |
|---|---|---|---|
| 109 | Escada | Party Love | 3, -45 |
| 14 | Cartier | Pasha de Cartier | 6, -45 |
| 20 | Yves Saint Laurent | La Nuit de L'Homme | -45, 0 |
| 70 | Cacharel | Amor Amor | 0, 35 |
| 28 | Versace | Blue Jeans | 0, -32 |
| 61 | Chanel | N°5 | -32, 3 |
| 16 | Zara | Tobacco Collection | 29, -16 |
| 34 | Sospiro | Erba Pura Magica | 0, -29 |
| 78 | Byredo | Bal d'Afrique | 26, 13 |
| 83 | Burberry | Brit Red | -22, 3 |
| 33 | Sospiro | Erba Gold | -6, -22 |
| 96 | Giorgio Armani | Power Of You | 6, 22 |
| 35 | Maison Francis Kurkdjian | Grand Soir | 0, -19 |
| 300 | Yves Saint Laurent | Babycat | -3, 19 |
| 59 | Versace | The Dreamer | -10, 16 |
| 62 | Chanel | N°19 | -16, 10 |
| 71 | Cacharel | Anaïs Anaïs | 0, 16 |
| 103 | Elie Saab | Girl of Now | 0, -13 |
| 108 | Escada | Rockin' Rio | 6, 13 |
| 94 | Maison Francis Kurkdjian | Oud Satin Mood | -3, 13 |
| 91 | Chanel | N°1 de Chanel L'Eau Rouge | 3, 13 |
| 97 | Tom Ford | Noir Extreme | 13, 13 |
| 13 | Franck Olivier | Oud Touch | -10, -3 |
| 81 | Britney Spears | Midnight Fantasy | -10, 0 |
| 87 | Burberry | Weekend | 10, 3 |
| 110 | Escada | Candy Love | 10, 0 |
| 95 | Yves Saint Laurent | Libre | -10, 10 |
| 84 | Burberry | Brit Sheer | 0, -10 |
| 53 | Tom Ford | Café Rose | 10, 6 |

## Photos de la hero (fournies le 21/10)

Mêmes dimensions entre clair et sombre, mais le flacon est décalé : **(4, 25) px** dans les portraits
(1122 × 1402), **(10, 10) px** dans les paysages (1672 × 941). Visible à la bascule de thème sur l'accueil. À
refaire au même cadrage (trépied fixe, brief `annexes/brief-photo-hero.md`), ou à recaler à la retouche par
une simple translation si le photographe le confirme ; pas de compensation en CSS.
