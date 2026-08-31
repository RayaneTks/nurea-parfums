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
        <div className="relative aspect-[4/3] w-full md:aspect-auto md:min-h-[32rem]">
          <PerfumeImage
            perfume={perfume}
            sizes="(max-width: 767px) 100vw, 50vw"
            priority={index === 0}
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
