"use client";

import { useEffect } from "react";

/**
 * Synchronise `--admin-vh` avec la hauteur réelle visible (visualViewport).
 *
 * iOS Safari (et PWA standalone) ne met PAS à jour `100dvh` de façon fiable
 * quand le clavier s'ouvre — le shell reste à la hauteur écran complet et le
 * clavier recouvre les inputs. visualViewport est la seule source de vérité.
 *
 * Effet : `--admin-vh` reflète l'espace réellement visible, et l'AdminShell
 * l'utilise pour sa hauteur racine. Quand le clavier monte, tout le shell
 * (incluant StickyAction) se compresse au-dessus du clavier.
 *
 * Expose aussi `--admin-keyboard-open` (0 ou 1) : la TabBar et les autres
 * composants concernés le lisent pour se masquer pendant la saisie clavier.
 */
const KEYBOARD_OPEN_THRESHOLD_PX = 150;

export function ViewportSync() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      const visibleHeight = vv ? vv.height : window.innerHeight;
      const layoutHeight = window.innerHeight;
      root.style.setProperty("--admin-vh", `${Math.round(visibleHeight)}px`);
      const offsetTop = vv ? vv.offsetTop : 0;
      root.style.setProperty("--admin-vv-offset", `${Math.round(offsetTop)}px`);

      // Clavier considéré ouvert si l'écart entre layout viewport et visual
      // viewport dépasse le seuil. Évalue à 0 ou 1 pour usage via calc() en CSS.
      const keyboardOpen = layoutHeight - visibleHeight > KEYBOARD_OPEN_THRESHOLD_PX ? 1 : 0;
      root.style.setProperty("--admin-keyboard-open", String(keyboardOpen));
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
      root.style.removeProperty("--admin-vh");
      root.style.removeProperty("--admin-vv-offset");
      root.style.removeProperty("--admin-keyboard-open");
    };
  }, []);

  return null;
}
