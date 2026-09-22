"use client";

import { useEffect, useRef } from "react";

/**
 * Haptique visuelle d'une écriture (05 §4.4) : l'élément pulse une fois quand sa valeur change — « Payé » et
 * « À encaisser » après un encaissement, le statut après un changement. Jamais au premier affichage.
 */
export function usePulse<T extends HTMLElement>(value: unknown) {
  const ref = useRef<T | null>(null);
  const previous = useRef(value);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    const element = ref.current;
    if (!element) return;
    element.classList.remove("admin-confirm-pulse");
    void element.offsetWidth;
    element.classList.add("admin-confirm-pulse");
    const done = () => element.classList.remove("admin-confirm-pulse");
    element.addEventListener("animationend", done, { once: true });
    return () => element.removeEventListener("animationend", done);
  }, [value]);
  return ref;
}
