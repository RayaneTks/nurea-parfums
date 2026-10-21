# Photos éditoriales de la vitrine (T16, 21/10/2026)

Quatre scènes, chacune en **deux lumières au même cadrage** (la bascule de thème ne change que la lumière) :
`public/branding/editorial/{atelier,choisir,ecrire,recevoir}-{sombre,clair}[-640].webp` (branche
`refonte/vitrine`), affichées par `EditorialPhoto` — l'atelier en haut de La parfumerie, une photo par temps de
commande (`OrderSteps`) sur La parfumerie et Contact.

## Décision du gérant (21/10)

« Génère-les toi-même », **sans visage ni aucune représentation d'être vivant** (ni personne, ni main, ni animal).
Les écrans des téléphones montrent **le vrai catalogue et la vraie page Snapchat** (demande du gérant), pas un écran
généré. Exception à la règle « ne jamais générer un faux flacon Nuréa » : levée par le gérant pour ces scènes, le
flacon étant copié sur la photo réelle (référence jointe à chaque génération).

## Méthode

1. Génération (Codex connecté ChatGPT, `.tmp/outils-visuels/gpt-image.mjs`) de la version **sombre**, avec la photo
   réelle du flacon (`public/branding/hero/flacon-portrait-sombre.webp`) en référence.
2. Version **claire** générée à partir de la sombre (« même scène, même cadrage au pixel près ») + la photo claire du
   flacon. Vérifié sur planche : objets au même endroit.
3. Écrans réels, capturés en téléphone (Playwright, 390 × 844 ; 340 × 736 pour Snapchat) :
   - **catalogue** : build de production, section `#collection` ; sombre puis clair **dans la même page** (bouton de
     thème) — l'ordre du catalogue change à chaque visite, deux visites auraient montré d'autres parfums ;
   - **Snapchat** : `snapchat.com/add/nureaparfums` (fenêtre « ouvrir l'appli » fermée). Les stories portent des
     **prix** (« jusqu'à 100 € », « 255 € → 75 € ») et des flacons de marques : **floutées** (39 → 69 % de la hauteur) —
     aucun prix sur la vitrine.
4. Incrustation en perspective (`scripts/refonte-vitrine/incruste-ecran.py`, coins par `coins-ecran.py` ou relevés
   sur zoom) — **mêmes coins dans les deux lumières** : choisir `[[93,828],[394,728],[882,1135],[510,1271]]`, écrire
   `[[319,700],[524,700],[421,1216],[187,1193]]` (images 1024 × 1536).
5. WebP 78 (1024) et 76 (640), déclinaisons dans `src/lib/images/loader.ts`.

**Piège** : plusieurs sessions génèrent en parallèle dans `~/.codex/generated_images` ; le script prenait « l'image la
plus récente » et a mélangé les scènes (et ramené l'Azzaro d'une autre session). Corrigé : il lit d'abord le chemin
répondu par Codex. Toujours vérifier chaque image avant de la ranger.

## Prompts

Commun :

> Photographie réaliste, format vertical 2:3, pour le site d'une parfumerie haut de gamme (Nuréa Parfums).
> Règles absolues : aucun être vivant — ni personne, ni main, ni doigt, ni visage, ni silhouette, ni reflet de personne, ni animal, ni plante. Aucun texte lisible, aucun logo ni marque, hormis le monogramme NP et le mot NURÉA de l'étiquette du flacon Nuréa, reproduits exactement comme sur la photo de référence jointe. Le flacon Nuréa doit être identique à la référence : même verre à facettes, même bouchon, même étiquette ronde au monogramme NP. Ne pas inventer d'autre flacon Nuréa.
> Lumière : celle de la référence — rayon de lumière de fenêtre rasant, chaud, ombres douces, profondeur de champ courte. Composition sobre, beaucoup d'air, sujet légèrement décentré. Pas de filtre, pas d'effet, pas de dégradé artificiel, pas de bokeh exagéré.

Ambiance sombre ajoutée : « pièce dans la pénombre, tons brun profond et ambre, comme la photo de référence ».

**atelier** : Scène : l'atelier de préparation, sans personne. Sur un plan de travail en pierre claire mate, un flacon Nuréa vide sans bouchon, son bouchon posé à côté, un petit entonnoir en verre, une éprouvette graduée en verre, deux flacons ambrés de laboratoire sans étiquette, une pipette en verre couchée. Rangé, net, précis, comme un atelier d'artisan.

**choisir** : Scène : un smartphone noir posé à plat sur une table en bois sombre, vu de trois quarts en plongée. Son écran allumé montre une grille floue de vignettes de flacons de parfum (illisible, aucun texte, aucun logo, aucune interface reconnaissable). À côté, hors netteté, un flacon Nuréa debout.

**ecrire** : Scène : un smartphone noir posé contre un flacon Nuréa, sur une table en pierre. Son écran allumé montre une conversation de messagerie floue : quelques bulles de message, illisibles, sans aucun texte, sans logo, sans photo de profil, sans interface reconnaissable.

**recevoir** : Scène : un colis d'expédition en carton kraft ouvert, posé sur une table, vu de trois quarts en plongée. À l'intérieur, sur un lit de papier de soie ivoire froissé, le flacon Nuréa couché ou debout, bien visible avec son étiquette. Le couvercle du carton est soulevé. Aucune étiquette d'adresse, aucun texte sur le carton.

Version claire (références : l'image sombre, puis la photo claire du flacon) :

> Reproduis EXACTEMENT la première image jointe (même scène, mêmes objets, même cadrage, même position de chaque objet au pixel près, même angle de vue, même format 2:3), mais en version claire : lumière du jour douce et chaude, pièce claire, tons ivoire, crème et sable, comme la seconde image jointe (la photo de référence claire du flacon Nuréa). Seules la lumière et les couleurs changent ; rien ne bouge.
> Règles absolues : aucun être vivant (ni personne, ni main, ni visage, ni reflet de personne, ni animal, ni plante). Aucun texte lisible ni logo, hormis le monogramme NP et NURÉA de l'étiquette, qui passe en bordeaux sur fond clair comme sur la référence claire. Le flacon Nuréa reste identique à la référence.

## À refaire si

- le profil Snapchat ou le catalogue changent beaucoup : recapturer, réincruster avec les mêmes coins ;
- le flacon Nuréa change : régénérer les quatre scènes.
