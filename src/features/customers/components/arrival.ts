"use client";

import { useEffect, useRef } from "react";

/**
 * « → E14 avec pulse » (06 E20) : le formulaire enregistre, puis navigue vers la fiche ; la fiche, montée après la
 * navigation, pulse une fois pour dire « c'est écrit » (05 §4.4). Le signal vit hors des composants : il traverse la
 * navigation côté client, et se consomme à la première lecture (un rechargement ne pulse pas).
 */

let pendingArrival: string | null = null;

/** À appeler juste avant de naviguer vers la fiche enregistrée. */
export function announceArrival(customerId: string): void {
  pendingArrival = customerId;
}

/** Pulse l'élément au montage si la fiche vient d'être enregistrée. */
export function useArrivalPulse<T extends HTMLElement>(customerId: string) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (pendingArrival !== customerId) return;
    pendingArrival = null;
    const element = ref.current;
    if (!element) return;
    element.classList.add("admin-confirm-pulse");
    const done = () => element.classList.remove("admin-confirm-pulse");
    element.addEventListener("animationend", done, { once: true });
    return () => element.removeEventListener("animationend", done);
  }, [customerId]);
  return ref;
}
