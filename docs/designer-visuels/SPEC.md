# Spécification — Designer des visuels Nuréa

## Objectif

Recréer en site web autonome l’outil designer fourni dans `Refonte des visuels Nuréa.html`, afin que le designer puisse retrouver chaque fiche, examiner les références disponibles, noter l’avancement et copier un prompt de génération ou de retouche.

Le site est publié séparément du site marchand Nuréa et accessible publiquement, comme demandé.

## Périmètre

- Reprendre l’interface mobile, les fiches, l’aperçu d’images, la recherche, les filtres, l’avancement, les brouillons et la copie du HTML fourni.
- Préserver les 534 fiches de l’artefact et ajouter les 18 références distinctes des lots fournisseur 2 et 3. Le lot 1 est déjà représenté dans l’artefact.
- Pour chaque référence sans visuel, conserver ou fournir quatre champs non obligatoires : univers, couleur, ambiance et matières. Si ces champs sont tous vides, générer le prompt de référence à partir des valeurs par défaut de la fiche. Dès qu’un champ est rempli, utiliser les seules instructions non vides du designer.
- Les nouveaux prompts s’appuient sur les notes vérifiées lorsqu’elles sont disponibles. À défaut, ils décrivent un univers visuel prudent et ne présentent pas des notes supposées comme des faits.
- Chaque nouvelle référence embarque la photo source de son flacon original, son lien de provenance et une instruction de reproduction fidèle. Le designer ne propose aucun contrôle sombre/clair tant qu'aucun visuel correspondant n'existe.
- Conserver le modèle de prompt et les exigences de cadrage et de sortie déjà présents dans le HTML. Le flacon source doit être joint séparément à l'outil de génération.

## Accès et données

- Site séparé, sans accès à la base de données de Nuréa et sans contrôle d'envoi d'image.
- Accès public : toute personne disposant de l’URL peut consulter et copier les fiches et prompts, ainsi que les images de référence embarquées.
- Avancement, champs et préférences restent enregistrés dans le navigateur du visiteur; aucun compte ni synchronisation entre appareils.
- Les images de flacon sont intégrées par l'agent dans le catalogue admin en `DRAFT` ; elles ne publient pas les parfums sur la vitrine. Un journal local conserve les URLs avant/après écriture.

## Critères d’acceptation

1. Le site est publié avec accès public et répond à son URL de production.
2. La liste contient 552 fiches : les 534 d’origine et les 18 ajouts des lots 2 et 3, sans doublon marque/nom.
3. Recherche, filtres d’état, détails, visionneuse, copie des prompts, saisie des champs et sauvegarde locale fonctionnent.
4. Chacune des 18 références ajoutées possède une photo vérifiée de son flacon original visible dans le designer et dans la fiche admin `DRAFT`.
5. Les vues Sombre et Clair sont absentes lorsqu'aucun visuel de ces types n'existe.
6. Chaque fiche sans visuel possède une valeur par défaut pour les quatre champs; les champs restent éditables et facultatifs.
7. Champ vide partout produit le prompt par défaut. Une instruction du designer remplace les valeurs par défaut, sans changer le modèle.
8. Les notes non vérifiées restent signalées comme telles ou sont omises du prompt; aucun accord olfactif n’est inventé.
9. Le site n'accède pas à la base de production et n'embarque aucune variable secrète.
