# Visuel de la hero « Chambre » — comment il a été fait, comment le refaire

Deux scènes, une par lumière, générées le 21/10/2026 avec l'outil maison (`.tmp/outils-visuels/gpt-image.mjs`,
ChatGPT via Codex CLI), en 1024 × 1536, puis **rognées en 4:5** (1024 × 1280) en gardant le bas (les matières,
le socle) : `sharp.extract({ top: 256 })`, WebP qualité 80, plus une déclinaison 640 × 800 (`-640.webp`).
Fichiers : `public/branding/hero/chambre-nuit*.webp` (thème sombre, variante de référence) et
`chambre-jour*.webp` (thème clair). Déclinaisons déclarées dans `src/lib/images/loader.ts`.

Même nature morte dans les deux (jasmin, résine d'ambre, copeau de santal, zeste de bergamote), en bas à droite ;
les deux tiers supérieurs gauche sont un mur nu : le visuel laisse sa place au texte sur bureau et se rogne en
3:2 par le bas sur téléphone sans perdre les matières. Aucun flacon, aucune marque : la hero appartient à Nuréa,
pas aux parfums à l'affiche. Une photographie réelle (socle, lumière rasante, mêmes consignes de composition)
peut remplacer ces scènes à l'identique : mêmes chemins, même rognage.

## Prompt — nuit (thème sombre)

```
Photographie publicitaire de parfumerie, format portrait vertical, image photoréaliste de très haute qualité, sans aucun texte, sans logo, sans flacon, sans étiquette, sans personne.

Scène : dans une chambre sombre aux murs enduits d'un plâtre brun très foncé, mat et chaud (presque noir, teinté de brun-rouge), un socle bas en pierre calcaire sombre porte une petite nature morte de matières à parfum : une fleur de jasmin blanche fraîchement coupée, un éclat de résine d'ambre translucide, un copeau de bois de santal, et à côté un zeste de bergamote. Les objets sont posés en bas à droite de l'image ; les deux tiers supérieurs gauche de l'image sont le mur nu, uniforme, calme, presque vide.

Lumière : une seule lumière rasante, chaude, qui vient de la gauche comme un rayon de fin de journée, dessine une longue ombre portée douce des objets sur le socle et une tache de lumière diffuse sur le mur. Le reste est dans la pénombre. Ambiance de nuit, silencieuse, précieuse, à la manière d'une photographie de luxe à l'argentique. Grain fin, mise au point sur la résine d'ambre, profondeur de champ courte.

Palette : bruns très sombres, ivoire chaud, ambre. Aucune couleur vive, aucun doré brillant, aucun marbre, aucun tissu, aucune bougie, aucune fumée.
```

## Prompt — jour (thème clair)

```
Photographie publicitaire de parfumerie, format portrait vertical, image photoréaliste de très haute qualité, sans aucun texte, sans logo, sans flacon, sans étiquette, sans personne.

Scène : dans une chambre claire aux murs enduits d'un plâtre ivoire chaud, mat et uniforme, un socle bas en pierre calcaire claire porte une petite nature morte de matières à parfum : une fleur de jasmin blanche fraîchement coupée, un éclat de résine d'ambre translucide, un copeau de bois de santal, et à côté un zeste de bergamote. Les objets sont posés en bas à droite de l'image ; les deux tiers supérieurs gauche de l'image sont le mur nu, uniforme, calme, presque vide.

Lumière : une seule lumière rasante de milieu de matinée, qui vient de la gauche par une fenêtre hors champ, dessine une longue ombre portée douce des objets sur le socle et une tache de lumière chaude sur le mur. Ambiance de jour, silencieuse, précieuse, à la manière d'une photographie de luxe à l'argentique. Grain fin, mise au point sur la résine d'ambre, profondeur de champ courte.

Palette : ivoire, sable, ambre doux, brun clair. Aucune couleur vive, aucun doré brillant, aucun marbre, aucun tissu, aucune bougie, aucune fumée.
```
