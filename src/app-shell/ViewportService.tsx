"use client";

import { useEffect } from "react";
import { VIEWPORT_VARIABLES, computeViewport, sameViewport, type ViewportVars } from "./viewport";

/** Instance qui écrit, s'il y en a une : un seul écrivain, même si deux montages se chevauchent. */
let owner: symbol | null = null;

/**
 * LE service viewport du shell (05 §2.8, §3.4) — fusion de l'ancien `ViewportSync` et de
 * `useAdminKeyboardInset`, qui se disputaient les mêmes variables. Seul écrivain de `--admin-vh`,
 * `--admin-keyboard-inset` et `--admin-vv-offset`, posées sur `<html>`.
 *
 * Monté par `AdminShell` et par l'écran de connexion (hors shell) — jamais les deux à la fois.
 * Les mesures sont groupées par image : un clavier qui monte émet des dizaines d'événements.
 */
export function ViewportService() {
  useEffect(() => {
    if (owner !== null) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("ViewportService monté deux fois : seule la première instance écrit (05 §2.8).");
      }
      return;
    }
    const token = Symbol("viewport");
    owner = token;
    const root = document.documentElement;
    let previous: ViewportVars | null = null;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const vv = window.visualViewport;
      const next = computeViewport(
        {
          innerHeight: window.innerHeight,
          visualHeight: vv ? vv.height : null,
          offsetTop: vv ? vv.offsetTop : 0,
          scale: vv ? vv.scale : 1,
        },
        previous,
      );
      if (sameViewport(previous, next)) return;
      previous = next;
      root.style.setProperty(VIEWPORT_VARIABLES.vh, `${next.vh}px`);
      root.style.setProperty(VIEWPORT_VARIABLES.keyboardInset, `${next.keyboardInset}px`);
      root.style.setProperty(VIEWPORT_VARIABLES.offsetTop, `${next.offsetTop}px`);
    };

    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(apply);
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      root.style.removeProperty(VIEWPORT_VARIABLES.vh);
      root.style.removeProperty(VIEWPORT_VARIABLES.keyboardInset);
      root.style.removeProperty(VIEWPORT_VARIABLES.offsetTop);
      if (owner === token) owner = null;
    };
  }, []);

  return null;
}
