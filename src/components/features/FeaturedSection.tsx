import type { FC } from "react";
import Link from "next/link";
import type { Perfume } from "@/lib/data";
import { buttonClass } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { contactHref } from "@/lib/catalog/perfumePresentation";
import { PerfumeImage } from "./PerfumeImage";

interface FeaturedSectionProps {
  perfumes: Perfume[];
}

/**
 * Bandeaux éditoriaux des parfums mis en avant — image et texte à parts égales,
 * en alternance.
 *
 * Les blocs partagent leurs bords et ne sont séparés qu'au filet (charte § 04) :
 * aucune carte flottante, aucun espace entre eux. L'incitation est au filet, le
 * seul aplat plein de la page d'accueil revenant à l'ouverture.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => (
  <section aria-label="Parfums du moment">
    {perfumes.map((perfume, index) => (
      <article
        key={perfume.id}
        data-reverse={index % 2 === 1}
        className="nurea-editorial border-b border-nurea-border"
      >
        {/*
          Mobile : le cadre prend le ratio des photos, rien n'est rogné.

          Desktop : la hauteur du bandeau et la largeur de la colonne sont la
          même valeur à un 2:3 près (`.nurea-editorial`, `app/globals.css`) — la
          photo remplit donc sa cellule au pixel, sans bande vide de part et
          d'autre. `object-contain` ne sert plus qu'au cas limite où le texte
          rend la rangée plus haute que le visuel : le flacon reste entier.

          Tailles : 277 px tant que la hauteur est au plancher (sous 1100 px de
          fenêtre), puis les deux tiers de 38vw, jusqu'au plafond de 427 px.
        */}
        <div className="nurea-visuel-parfum relative w-full md:aspect-auto">
          <PerfumeImage
            perfume={perfume}
            sizes="(max-width: 767px) 100vw, (max-width: 1099px) 280px, (max-width: 1684px) 26vw, 427px"
            priority={index === 0}
            className="md:object-contain"
          />
        </div>

        {/* La révélation porte sur le contenu, pas sur la cellule : une cellule
            à `opacity: 0` laisserait voir la couleur de gouttière en aplat. */}
        <div className="flex flex-col justify-center px-6 py-12 md:px-18 md:py-18">
          <ScrollReveal className="flex flex-col items-start">
            <p className="nurea-label">Parfum du moment</p>

            <p className="nurea-caption mt-6">{perfume.brand}</p>
            <h2 className="nurea-section-title mt-1 text-nurea-text">{perfume.name}</h2>

            <p className="nurea-body nurea-prose mt-6">
              Une référence choisie pour sa tenue et son caractère, disponible
              immédiatement. Écrivez-nous pour connaître le prix du jour et
              réserver votre flacon.
            </p>

            <Link
              href={contactHref(perfume.name, perfume.brand)}
              className={buttonClass("outline", "mt-10")}
            >
              Commander ce parfum
            </Link>
          </ScrollReveal>
        </div>
      </article>
    ))}
  </section>
);
