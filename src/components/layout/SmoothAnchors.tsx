"use client";

import { useEffect } from "react";

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
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (location.hash !== link.hash) history.pushState(history.state, "", link.hash);
      if (!target.hasAttribute("tabindex") && !target.matches("a, button, input, select, textarea")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
