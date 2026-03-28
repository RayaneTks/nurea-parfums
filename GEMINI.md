# Engineering Core Mandates — Nuréa Parfums

Ce document définit les standards de qualité, de vérification et d'amélioration continue pour le projet. Ces règles s'appliquent à toute intervention technique ou créative.

## 1. Boucle de Qualité (Loop)

Avant de considérer une tâche comme terminée, les étapes suivantes sont **obligatoires** :

- **Vérification Statique** : Exécuter `npx tsc --noEmit` et `npm run lint`.
- **Validation Build** : Exécuter `npm run build` localement pour anticiper les erreurs de déploiement (notamment les erreurs de type "CSR Bailout" ou "Suspense missing").
- **Audit Visuel** : Vérifier le rendu sur mobile (390px) ET desktop. Vérifier l'absence de scroll horizontal parasite.
- **Vérification Tactile** : S'assurer que les zones de clic font au moins 44px et qu'un feedback `active:scale` est présent.

## 2. Auto-Correction & Apprentissage

Chaque erreur rencontrée doit être documentée pour éviter sa répétition :

- **Piège Next.js** : Utiliser `useSearchParams` exige systématiquement un wrap `<Suspense>`.
- **Piège Prisma** : Toujours vérifier la validité du schéma et la présence des index sur les relations (`@@index`).
- **Piège Imports** : Toujours vérifier que les alias `@/` pointent vers le bon dossier (`src/` vs `app/`).

## 3. Standards de Documentation

- **Contextualisation** : Après chaque fonctionnalité majeure, mettre à jour `CLAUDE.md` et les fichiers `.md` de documentation concernés.
- **Méthodologie** : Les réflexions UI/UX et les décisions architecturales doivent être consignées dans `docs/ux-audit-*` ou similaire.
- **Historique Git** : Commits clairs, orientés métier, sans mention technique d'outil (IA, Cursor, etc.).

## 4. Ethos de Développement

- **Travail Intelligent (No Blind Work) :** Ne jamais appliquer une instruction de manière aveugle si elle nuit à l'UX ou au design du projet (ex: casser les proportions d'un logo). Faire preuve d'esprit critique, analyser le problème racine (ex: marges invisibles d'une image) et proposer la solution la plus élégante et robuste.
- **Validation Multi-Agents :** Utiliser systématiquement l'outil `expert-code-review` pour valider les changements majeurs avant de commit (Performance, Sécurité, UX/UI, Qualité).
- **Chirurgie Précise :** Appliquer des changements ciblés. Ne jamais refactoriser du code fonctionnel hors scope sans demande explicite.
- **Zéro Régression & Performance** : Toujours lire le code environnant avant de modifier. **Ne jamais sacrifier le LCP (Largest Contentful Paint)** ou l'expérience utilisateur visuelle pour résoudre un warning d'hydratation ou de linter (ex: ne pas masquer une image de fond au premier rendu).
- **Lighthouse vs Design System** : Lors de corrections Lighthouse (ex: contrastes), toujours vérifier que la modification ne brise pas l'harmonie de la Direction Artistique (ex: ne pas mettre de texte noir sur un bouton sombre si cela dénature le design).
- **Mobile-First Permanent** : Développer pour l'iPhone en priorité, adapter pour le desktop ensuite.
- **Performance Perçue** : Utiliser des skeletons et fusionner les appels API pour garantir une sensation de vitesse instantanée.

---
*Ce document est la référence absolue pour la conduite des opérations sur ce dépôt.*
