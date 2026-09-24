# Engineering Core Mandates — Nuréa Parfums

Ce document définit les standards de qualité, de vérification et d'amélioration continue pour le projet. Ces règles s'appliquent à toute intervention technique ou créative.

## 1. Boucle de Qualité (Loop)

Avant de considérer une tâche comme terminée, les étapes suivantes sont **obligatoires** :

- **Vérification Statique** : Exécuter `npm run typecheck`, `npm run lint` et `npm test`.
- **Jamais `npm run build` tel quel** : il lance la migration de la base de **production** (`.env` y pointe). Pour valider une construction : `NUREA_SKIP_MIGRATE_DEPLOY=1` avec des `DATABASE_URL`/`DIRECT_URL` factices ou locales (voir `CLAUDE.md`). Les erreurs de type « CSR Bailout » ou « Suspense missing » se voient aussi en `npm run dev`.
- **Audit Visuel** : Vérifier le rendu sur mobile (320, 375 et 430 px) ET desktop, en thème sombre et clair. Vérifier l'absence de scroll horizontal parasite. Pour la gestion : `npm run test:layout`.
- **Vérification Tactile** : S'assurer que les zones de clic font au moins 44px. Le retour au toucher est une **couleur**, jamais un `scale` ni un déplacement (charte vitrine § 05, `DESIGN.md`).

## 2. Auto-Correction & Apprentissage

Chaque erreur rencontrée doit être documentée pour éviter sa répétition :

- **Piège Next.js** : Utiliser `useSearchParams` exige systématiquement un wrap `<Suspense>`.
- **Piège Prisma** : Toujours vérifier la validité du schéma et la présence des index sur les relations (`@@index`).
- **Piège Imports** : Toujours vérifier que les alias `@/` pointent vers le bon dossier (`src/` vs `app/`).

## 3. Standards de Documentation

- **Contextualisation** : Après chaque fonctionnalité majeure, mettre à jour `CLAUDE.md` et les fichiers `.md` de documentation concernés. Une documentation qui promet ce que le code ne fait pas est un bug.
- **Méthodologie** : Les décisions de design vivent dans `DESIGN.md` (vitrine) et `docs/admin/DESIGN.md` (gestion) ; les décisions d'architecture dans `docs/refonte/`.
- **Historique Git** : Commits clairs, orientés métier, sans mention technique d'outil (IA, Cursor, etc.).

## 4. Ethos de Développement

- **Travail Intelligent (No Blind Work) :** Ne jamais appliquer une instruction de manière aveugle si elle nuit à l'UX ou au design du projet (ex: casser les proportions d'un logo). Faire preuve d'esprit critique, analyser le problème racine (ex: marges invisibles d'une image) et proposer la solution la plus élégante et robuste.
- **Relecture :** Faire relire les changements majeurs avant de les commiter (performance, sécurité, UX/UI, qualité) — par une revue de code dédiée quand l'outil en propose une.
- **Chirurgie Précise :** Appliquer des changements ciblés. Ne jamais refactoriser du code fonctionnel hors scope sans demande explicite.
- **Zéro Régression & Performance** : Toujours lire le code environnant avant de modifier. **Ne jamais sacrifier le LCP (Largest Contentful Paint)** ou l'expérience utilisateur visuelle pour résoudre un warning d'hydratation ou de linter (ex: ne pas masquer une image de fond au premier rendu).
- **Lighthouse vs Design System** : Lors de corrections Lighthouse (ex: contrastes), toujours vérifier que la modification ne brise pas l'harmonie de la Direction Artistique (ex: ne pas mettre de texte noir sur un bouton sombre si cela dénature le design).
- **Mobile-First Permanent** : Développer pour l'iPhone en priorité, adapter pour le desktop ensuite.
- **Performance Perçue** : Utiliser des skeletons et fusionner les appels API pour garantir une sensation de vitesse instantanée.

---
*Ce document est la référence absolue pour la conduite des opérations sur ce dépôt.*
