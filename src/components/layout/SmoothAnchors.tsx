"use client";

import { useEffect } from "react";

/** `--ease-move` : cubic-bezier(0.77, 0, 0.175, 1), résolue par dichotomie sur x. */
function easeMove(t: number): number {
  const bez = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (bez(0.77, 0.175, mid) < t) lo = mid;
    else hi = mid;
  }
  return bez(0, 1, (lo + hi) / 2);
}

function glisserVers(y: number) {
  const depart = scrollY;
  const distance = y - depart;
  if (Math.abs(distance) < 2) return;
  // 450 ms pour un écran, jusqu'à 900 ms pour une longue page.
  const duree = Math.min(900, 450 + Math.abs(distance) / 8);
  const debut = performance.now();
  let fini = false;
  const stop = () => {
    fini = true;
    for (const t of ["wheel", "touchstart", "keydown"] as const) removeEventListener(t, stop);
  };
  for (const t of ["wheel", "touchstart", "keydown"] as const) addEventListener(t, stop, { passive: true });
  const pas = (maintenant: number) => {
    if (fini) return;
    const t = Math.min(1, (maintenant - debut) / duree);
    scrollTo(0, depart + distance * easeMove(t));
    if (t < 1) requestAnimationFrame(pas);
    else stop();
  };
  requestAnimationFrame(pas);
}

/**
 * Liens vers un endroit de la même page (`#collection`, `#main-content`…) : la page **glisse** jusqu'à
 * la cible au lieu d'y sauter (demande du gérant, 22/10/2026 : « Voir le catalogue » téléportait).
 *
 * Pas de `scroll-behavior: smooth` sur `<html>` : il ferait aussi glisser chaque changement de page du
 * routeur. Ici, seul le clic simple sur un lien d'ancre est repris ; la marge de défilement de la cible
 * (`scroll-mt-*`) est respectée, l'adresse prend l'ancre, et le focus suit la cible comme avec un saut
 * natif (lien d'évitement au clavier). Mouvement réduit : saut immédiat.
 */
export function SmoothAnchors() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href^='#']");
      if (!(link instanceof HTMLAnchorElement)) return;
      const id = decodeURIComponent(link.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const marge = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const y = target.getBoundingClientRect().top + scrollY - marge;
      if (reduce) scrollTo(0, y);
      else glisserVers(y);
      if (location.hash !== link.hash) history.pushState(history.state, "", link.hash);
      if (!target.hasAttribute("tabindex") && !target.matches("a, button, input, select, textarea")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
