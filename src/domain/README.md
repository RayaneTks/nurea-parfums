# src/domain — règles métier pures

Tout ce qui se calcule sans base vit ici (docs/refonte/04-ARCHITECTURE.md §1.3, §2.1).
Importable par le client ET le serveur : le formulaire pré-contrôle avec les mêmes
fonctions que le writer, qui recontrôle toujours.

| Fichier | Contenu | Référence |
|---|---|---|
| `money.ts` | Types opaques `Eur` / `Dzd` / `Rate`, `MoneyString` ; saisie, frontières base et réseau, arithmétique exacte, `dzdToEur`, « La moitié », pourcentage, formatage fr-FR. **Seul importeur de `decimal.js-light`.** | 04 §5 |
| `document-status.ts` | Statuts et origines d'un document, `canTransition` (réserves plutôt que refus), `assertTransition` (garde du writer), horodatages d'événement, « En retard », libellés. | 03 §2.3, §5.6 |
| `document-balance.ts` | Jumeau de la vue `DocumentBalance` : total, coût, payé, dû clampé par document, trop-perçu, marge avant dépenses ; créance ancienne. | 03 §5.1, §5.8 ; 04 §6.4 |
| `fulfillment.ts` | Avancement de livraison (`none` / `partial` / `full`), lignes restant à livrer, bornage du pointage. | 03 §4.7 |
| `stock.ts` | Statut de stock (non suivi / rupture / bas / ok), réserve de plancher d'un delta livré. | 03 §4.7 ; 04 §11 |
| `publication.ts` | Visibilité vitrine d'un parfum et d'une marque, mise en avant (≤ 2, parfum visible), cascade de masquage, messages de refus uniques. | 04 §12 |
| `periods.ts` | Bornes jour / semaine (lundi) / mois / année en Europe/Paris, clé du jour, libellés — jumelles de `nurea_period_start/end`. | 03 §5.1 ; 04 §6.5 |
| `phone.ts` | Formats français → E.164, aperçu « +33 6 12 34 56 78 ». | 03 §3 (`Customer`) |
| `ids.ts` | `newId()` (UUID v4, créations idempotentes) et parseurs d'identifiants marqués. | 04 §3.6 |
| `errors.ts` | `DomainError(code, message, field?)`, `NeedsConfirmation(title, reserves, confirmLabel)`. | 04 §9.1 |

Règles :

- **Aucun import** de `next/*`, `react`, `@prisma/client`, ni de `src/server`, `src/features`,
  `src/ui`, `src/contracts`. Le domaine ne dépend de rien (test `layers`).
- **Argent** : jamais `number`, `Number()`, `parseFloat` ni `toFixed` sur un montant hors de
  `money.ts` ; un montant traverse le réseau en `MoneyString` (`toWire` / `eurFromWire`).
- **Temps** : jamais `setHours(0,0,0,0)` ni `new Date(année, mois, 1)` ; les bornes passent par
  `periods.ts` (Europe/Paris, robuste aux changements d'heure).
- **Textes** : les réserves et refus sont des phrases françaises complètes, tutoiement, geste
  qui débloque ; l'UI les affiche telles quelles, sans les recopier.
- Fonctions pures, testées dans `__tests__/` (`npx vitest run --project unit`).
