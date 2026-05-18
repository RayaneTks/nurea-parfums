"use client";

import { useEffect } from "react";

/**
 * Synchronise la hauteur visible réelle (`visualViewport`) avec les variables CSS
 * `--nurea-vh` et `--nurea-keyboard-h`, et applique la classe
 * `nurea-keyboard-open` sur l'élément racine quand le clavier mobile est ouvert.
 *
 * iOS Safari et la plupart des PWA Android ne mettent PAS à jour `100dvh` quand
 * le clavier monte : tout reste figé à la hauteur écran complet et le clavier
 * recouvre les inputs (CTA, navbar bottom, etc. invisibles). Seule
 * `visualViewport` reflète l'espace réellement visible.
 */
export function PublicViewportSync() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const layoutH = window.innerHeight || h;
      const keyboardH = Math.max(0, layoutH - h);

      root.style.setProperty("--nurea-vh", `${Math.round(h)}px`);
      root.style.setProperty("--nurea-keyboard-h", `${Math.round(keyboardH)}px`);

      if (keyboardH > 100) {
        root.classList.add("nurea-keyboard-open");
      } else {
        root.classList.remove("nurea-keyboard-open");
      }
    };

    apply();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
    } else {
      window.addEventListener("resize", apply);
      window.addEventListener("orientationchange", apply);
    }

    return () => {
      if (vv) {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      } else {
        window.removeEventListener("resize", apply);
        window.removeEventListener("orientationchange", apply);
      }
      root.style.removeProperty("--nurea-vh");
      root.style.removeProperty("--nurea-keyboard-h");
      root.classList.remove("nurea-keyboard-open");
    };
  }, []);

  return null;
}
