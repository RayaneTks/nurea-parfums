/**
 * Contrat entre le banc des états de l'Accueil (`accueil.tsx`, exécuté dans la page) et ses specs
 * (`layout-invariants.spec.ts`, `parcours/accueil.spec.ts`). Module pur, importé des deux côtés.
 *
 * Pourquoi un banc : le jeu e2e est partagé et porte déjà des documents, des créances et des alertes de
 * stock (`e2e/fixtures/seed.ts`). Le **vide de première utilisation** et le cas **« tout va bien »** (aucune
 * alerte) sont donc inatteignables depuis la base — alors que 06 E01 les exige, et que `test:layout` doit les
 * éprouver aux trois largeurs. Le banc monte les VRAIS composants de `src/features/dashboard` avec leurs
 * données, sous la feuille admin réelle : les invariants mesurés sont ceux de l'écran.
 *
 * Le cas NOMINAL, lui, est éprouvé sur la vraie page `/admin` (il est atteignable) — le banc le rend aussi,
 * pour que les trois états se comparent dans les mêmes conditions.
 */

/** Variable globale posée par le banc : `window[BANC_ACCUEIL].mount(scène)`. */
export const BANC_ACCUEIL = "__nureaBancAccueil";

export const ACCUEIL_SCENES = ["vide-de-depart", "nominal", "tout-va-bien"] as const;
export type AccueilScene = (typeof ACCUEIL_SCENES)[number];

/** Libellés attendus par les specs, écrits une fois. */
export const ACCUEIL_TEXTS = {
  pourCommencer: "Pour commencer",
  nouveautes: "Nouveautés",
  aFaire: "À faire",
  reglages: "Réglages",
} as const;
