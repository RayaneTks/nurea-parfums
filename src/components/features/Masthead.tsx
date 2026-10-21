import type { FC } from "react";

/**
 * Manchette de l'accueil (04-PLAN-EXECUTION.md § B.10, composition « La une »).
 *
 * Le H1, unique, porte la marque et la ville (référencement : `01-INVARIANTS.md`). Il se compose
 * comme la manchette d'un journal : une ligne en `title`, pas un titre d'affiche — la page s'ouvre
 * sur la scène, juste dessous, pas sur un slogan. Rien d'autre ici : ni phrase, ni bouton, ni
 * compteur (la phrase de la maison, avec ses chiffres, vient après la première scène).
 *
 * « Nuréa Parfums, » ne se coupe pas dès 360 px ; plus étroit, il passe sur deux lignes plutôt que
 * de déborder de l'écran.
 */
export const Masthead: FC = () => (
  <section aria-labelledby="accueil-titre" className="page-x enter py-3 md:py-4">
    <h1 id="accueil-titre" className="t-title">
      <span className="min-[360px]:whitespace-nowrap">Nuréa Parfums,</span> <span className="text-fg-2">Marseille</span>
    </h1>
  </section>
);
