import type { FC } from "react";

interface MastheadProps {
  /** Parfums publiés au catalogue. */
  perfumeCount: number;
  /** Marques qui ont au moins un parfum publié. */
  brandCount: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/**
 * Manchette de l'accueil (04-PLAN-EXECUTION.md § B.10, composition « Vitrine ») : le H1, unique,
 * porte la marque et la ville (référencement : `01-INVARIANTS.md`), en `title` — une signature en
 * tête de page, pas une affiche. Dessous, les deux chiffres comptés sur le catalogue publié, rien
 * d'autre (un catalogue vide n'affirme pas « 0 parfum »). Le grand format typographique de la page
 * est réservé au nom du parfum à l'affiche, juste dessous.
 *
 * « Nuréa Parfums, » ne se coupe pas dès 360 px ; plus étroit, il passe sur deux lignes plutôt que
 * de déborder de l'écran.
 */
export const Masthead: FC<MastheadProps> = ({ perfumeCount, brandCount }) => (
  <section aria-labelledby="accueil-titre" className="page-x enter py-6 md:py-8">
    <h1 id="accueil-titre" className="t-title">
      <span className="min-[360px]:whitespace-nowrap">Nuréa Parfums,</span> <span className="text-fg-2">Marseille</span>
    </h1>
    {perfumeCount > 0 && (
      <p className="t-caption mt-2">
        {plural(perfumeCount, "parfum")} · {plural(brandCount, "marque")}
      </p>
    )}
  </section>
);
