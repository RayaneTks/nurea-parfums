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
 * Bandeaux éditoriaux des parfums mis en avant — la photo à sa taille exacte, le
 * texte prend le reste, en alternance.
 *
 * Les blocs partagent leurs bords et ne sont séparés qu'au filet (charte § 04) :
 * aucune carte flottante, aucun espace entre eux. L'incitation est au filet, le
 * seul aplat plein de la page d'accueil revenant à l'ouverture.
 *
 * `.nurea-page` : le bandeau tenait toute la largeur de la fenêtre, seul bloc du
 * site à le faire — navigation, ouverture, catalogue et pied de page tiennent
 * tous dans la marge de page (charte § 04). Sur un écran de 1920, la photo
 * commençait donc au ras de la vitre, 430 px avant le logo, et le texte
 * s'arrêtait à 780 px du bord droit : ce vide-là ne se lisait pas comme une
 * marge, mais comme un trou. Dans la marge commune, il redevient celui de
 * toutes les autres sections — et la photo s'aligne sur le logo.
 *
 * `max-md:px-0` : sur téléphone, la marge de page est retirée et la photo tient
 * toute la largeur de l'écran — c'est là qu'elle est la plus petite, et 48 px de
 * marge lui coûtaient un huitième de sa largeur. Le texte, lui, garde son
 * retrait de 24 px, celui de la charte, posé par la cellule elle-même.
 */
export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => (
  <section aria-label="Parfums du moment" className="nurea-page max-md:px-0">
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

          `sizes` décrit la largeur réelle — 277 px tant que la hauteur est au
          plancher (sous 1100 px de fenêtre), puis les deux tiers de 38vw,
          jusqu'au plafond de 427 px. Il ne change RIEN au poids téléchargé
          aujourd'hui : `images.unoptimized` est à `true` (`next.config.mjs`,
          correctif du 22/09/2026 — le quota de transformations Vercel), donc
          aucun `srcset` n'est rendu et la photo est servie telle quelle, à
          1024 × 1536 et ~145 Ko. L'attribut reste parce que `fill` l'exige et
          qu'il sera juste le jour où l'optimisation rouvrira.
        */}
        <div className="nurea-visuel-parfum relative w-full md:aspect-auto">
          <PerfumeImage
            perfume={perfume}
            sizes="(max-width: 767px) 100vw, (max-width: 1099px) 280px, (max-width: 1684px) 26vw, 427px"
            priority={index === 0}
            className="md:object-contain"
          />
        </div>

        {/* Retrait de 40 px et non de 72 : la marge de page en pose déjà 72 à
            l'extérieur, et les deux cumulées ne laissaient que 200 px de texte
            entre 768 et 1024 px — moins que le bouton qu'elles doivent tenir.

            La révélation porte sur le contenu, pas sur la cellule : une cellule
            à `opacity: 0` laisserait voir la couleur de gouttière en aplat. */}
        <div className="flex flex-col justify-center px-6 py-12 md:px-10 md:py-18">
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
