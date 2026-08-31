"use client";

import { useEffect, useRef } from "react";

/**
 * Marque l'élément comme révélé la première fois qu'il entre dans le viewport.
 *
 * Le style est porté par `.nurea-reveal[data-revealed]` (`app/globals.css`) :
 * une opacité et 12 px de montée, une seule fois. La charte n'admet aucun
 * autre mouvement — voir § 05.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.1
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.dataset.revealed = "true";
        observer.disconnect();
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
