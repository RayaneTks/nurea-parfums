"use client";

import { useEffect, useId, useRef, useState, type FC } from "react";
import type { Perfume } from "@/lib/data";
import { buttonClass } from "@/components/ui/Button";
import { PerfumeCard } from "./PerfumeCard";
import { PerfumeCardSkeleton } from "./PerfumeCardSkeleton";
import { requestSheet } from "./openPerfume";

/** Le flocon du bouton : six branches, trait fin, comme les icônes de la barre. */
const Flocon: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden="true">
    <path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7" />
    <path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2M4.2 9.8l3 .7.8-3M16 6.5l.8 3 3-.7M4.2 14.2l3-.7.8 3M16 17.5l.8-3 3 .7" />
  </svg>
);

/**
 * « Parfums du moment » (demande du gérant, 22/10/2026) : la sélection de saison de `saison.ts`, en
 * cartes du catalogue — mêmes cartes, même fiche au toucher (`requestSheet`), aucun composant neuf.
 *
 * **La section entière est un moment** (gérant, 22/10 : « il faut que ça retienne l'attention ») : une
 * bande pleine largeur qui change de papier (`--saison-fond`, filets `--frost`), comme un cahier de
 * saison dans un magazine, et du givre — un grain irrégulier, pas un motif répété — qui pousse depuis
 * deux coins quand elle paraît. Le titre reste un titre : ni icône, ni mot coloré, ni neige qui tombe
 * (écartés à l'audit anti-automatismes du 22/10). Règles : `.saison-bande` dans `globals.css`.
 *
 * Repliée, la grille montre deux rangées (4 cartes sur téléphone, 6 sur tablette, 8 sur ordinateur ;
 * `.saison` dans `globals.css`) ; le bouton déroule le reste. Le bouton porte le **givre** demandé par
 * le gérant : à sa première apparition, une gelée se propage depuis le flocon (`clip-path`, `--dur-4`)
 * et reste ; au survol (souris) le flocon tourne d'un sixième de tour. Mouvement réduit : le givre est
 * là d'emblée, sans propagation (`--dur-4` vaut 0).
 *
 * Les visuels attendent : tant que la page charge, la grille montre les squelettes du catalogue, et
 * les vraies cartes ne viennent qu'une fois la page chargée et la section à moins d'un écran. Sans
 * cela, leurs images partaient avec la photo de la hero. Avec : LCP 1,97 s (4G lente, CPU ×4,
 * catalogue de démonstration, `scripts/refonte-vitrine/lcp.mjs`, 22/10/2026 ; budget 2,5 s).
 */
export const SeasonSection: FC<{ titre: string; perfumes: Perfume[] }> = ({ titre, perfumes }) => {
  const [ouvert, setOuvert] = useState(false);
  const [gel, setGel] = useState(false);
  const [pret, setPret] = useState(false);
  const [bandeVue, setBandeVue] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null);
  const titreId = useId();
  const grilleId = useId();

  useEffect(() => {
    const el = bouton.current;
    if (!el || gel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setGel(true);
          observer.disconnect();
        }
      },
      { threshold: 1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [gel]);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let observer: IntersectionObserver | undefined;
    const guetter = () => {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setPret(true);
            observer?.disconnect();
          }
        },
        { rootMargin: "100% 0px" }
      );
      observer.observe(el);
    };
    if (document.readyState === "complete") guetter();
    else window.addEventListener("load", guetter, { once: true });
    return () => {
      window.removeEventListener("load", guetter);
      observer?.disconnect();
    };
  }, []);

  /* La bande : le givre des coins pousse à sa première apparition, une fois. */
  useEffect(() => {
    const el = section.current;
    if (!el || bandeVue) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setBandeVue(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [bandeVue]);

  const basculer = () => {
    setOuvert((v) => !v);
    // Replier depuis le bas de la liste : revenir au titre, sinon on se retrouve loin sous la section.
    if (ouvert) section.current?.scrollIntoView({ block: "start" });
  };

  return (
    <section
      ref={section}
      aria-labelledby={titreId}
      className="saison-bande page-x mt-[var(--space-section)] scroll-mt-32 md:scroll-mt-20"
      data-vue={bandeVue || undefined}
    >
      <h2 id={titreId} className="t-title mb-6">
        {titre}
      </h2>
      <ul id={grilleId} className="saison grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" data-ouvert={ouvert}>
        {perfumes.map((perfume) => (
          <li key={perfume.id} className="flex">
            {pret ? (
              <PerfumeCard perfume={perfume} onOpen={(p) => requestSheet(p.id)} />
            ) : (
              <div className="w-full">
                <PerfumeCardSkeleton />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-center">
        <button
          ref={bouton}
          type="button"
          onClick={basculer}
          aria-expanded={ouvert}
          aria-controls={grilleId}
          data-gel={gel || undefined}
          className={buttonClass("outline", "givre press gap-2")}
        >
          <Flocon className="givre-flocon h-5 w-5 shrink-0" />
          {ouvert ? "Afficher moins" : `Voir les ${perfumes.length} parfums`}
        </button>
      </div>
    </section>
  );
};
