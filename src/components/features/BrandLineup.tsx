"use client";

import { useEffect, useState, type FC } from "react";
import type { Perfume } from "@/lib/data";
import { PerfumeImage } from "./PerfumeImage";

/** Vrai une fois la page chargée et le navigateur au repos : les images secondaires peuvent partir. */
function useAfterLoad(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const go = () => {
      // Safari n'a pas `requestIdleCallback` : un court délai après `load` en tient lieu.
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      else globalThis.setTimeout(() => setReady(true), 200);
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);
  return ready;
}

/**
 * La petite ligne de flacons d'une tuile de marque (`BrandShelf`) : trois miniatures 2:3, décoratives
 * (le nom de la marque porte le lien). Elles ne partent qu'**après le chargement de la page** : les 24
 * miniatures des 8 tuiles tombaient dans la distance de préchargement des images paresseuses et
 * prenaient le débit de la photo de la hero (élément LCP). Avant, un aplat `--surface-2` de même taille :
 * rien ne bouge quand elles arrivent.
 */
export const BrandLineup: FC<{ perfumes: Perfume[] }> = ({ perfumes }) => {
  const ready = useAfterLoad();
  return (
    <span className="mt-auto grid grid-cols-3 gap-1" aria-hidden="true">
      {perfumes.map((perfume) => (
        <span key={perfume.id} className="relative block aspect-[2/3] overflow-hidden rounded-sm bg-surface-2">
          {ready && <PerfumeImage perfume={perfume} sizes="(min-width: 768px) 96px, 48px" />}
        </span>
      ))}
    </span>
  );
};
