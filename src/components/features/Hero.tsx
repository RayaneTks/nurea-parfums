import type { FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { SITE_TAGLINE } from "@/lib/site";

/**
 * Ouverture de la vitrine.
 *
 * Composant serveur : rien ici ne dépend du thème résolu côté client. Le voile
 * posé sur la photo est un jeton (`--nurea-hero-scrim`) qui suit le thème tout
 * seul — c'est ce qui évite d'embarquer `next-themes` dans le premier écran.
 *
 * Charte § 05 : un seul bouton plein par écran. C'est celui-ci ; toutes les
 * autres incitations de la page d'accueil sont au filet ou en lien texte.
 * Le monogramme n'apparaît pas en filigrane : la charte interdit de le poser
 * nu sur une photo.
 */
export const Hero: FC = () => (
  <header className="relative isolate flex min-h-[88svh] items-center border-b border-nurea-border md:min-h-[92svh]">
    <Image
      src="/branding/visuel-hero.webp"
      alt=""
      fill
      sizes="100vw"
      priority
      fetchPriority="high"
      quality={85}
      className="-z-10 object-cover object-[center_30%]"
    />
    <div
      aria-hidden
      className="absolute inset-0 -z-10"
      style={{ background: "var(--nurea-hero-scrim)" }}
    />

    <div className="nurea-page pb-18 pt-32 md:pt-40">
      <p className="nurea-label">{SITE_TAGLINE}</p>

      <h1 className="nurea-title mt-6 max-w-[14ch] text-nurea-text">
        L&apos;excellence du parfum
      </h1>

      <p className="nurea-body nurea-prose mt-6">
        Retrouvez vos parfums préférés au meilleur prix. Une sélection
        rigoureuse des plus grandes marques, pour homme et pour femme,
        disponible immédiatement.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        {/* Ancre interne : `scroll-behavior` et `scroll-padding-top` la
            traitent nativement, sans écouteur de clic. */}
        <a href="#collection" className={buttonClass("solid")}>
          Voir le catalogue
        </a>
        <Link href="/contact" className={buttonClass("outline")}>
          Commander un parfum
        </Link>
      </div>

      <p className="nurea-label mt-10 text-nurea-subtle">
        Échanges privés · Conseils sur-mesure
      </p>
    </div>
  </header>
);
