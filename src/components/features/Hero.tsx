import type { FC } from "react";

interface HeroProps {
  /** Parfums publiés au catalogue. */
  perfumeCount: number;
  /** Marques qui ont au moins un parfum publié. */
  brandCount: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/**
 * Ouverture de l'accueil (04-PLAN-EXECUTION.md § B.10, composition A « Couverture »).
 *
 * Le H1, unique, porte la marque et la ville (référencement : `01-INVARIANTS.md`), puis une ligne
 * de faits comptés sur le catalogue publié — rien d'autre n'y est affirmé. Aucune photo, aucun
 * bouton : l'image du premier écran est le visuel du premier parfum mis en avant, juste dessous
 * (`FeaturedSection`), et le seul bouton plein reste celui de la fiche.
 *
 * « Nuréa Parfums, » ne se coupe pas dès 360 px ; plus étroit, il passe sur deux lignes plutôt que
 * de déborder de l'écran.
 */
export const Hero: FC<HeroProps> = ({ perfumeCount, brandCount }) => (
  <section aria-labelledby="accueil-titre" className="page-x pt-6">
    <h1 id="accueil-titre" className="t-display">
      <span className="min-[360px]:whitespace-nowrap">Nuréa Parfums,</span>{" "}
      <span className="block text-fg-2">Marseille</span>
    </h1>
    {/* Catalogue vide (base injoignable) : aucun « 0 parfum » affiché. */}
    {perfumeCount > 0 && (
      <p className="t-caption mt-2">
        {plural(perfumeCount, "parfum")} · {plural(brandCount, "marque")} · Commande sur Snapchat
      </p>
    )}
  </section>
);
