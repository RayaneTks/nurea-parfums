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
 * (incluant TabBar et StickyAction) se compresse au-dessus du clavier.
 */
export function ViewportSync() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty("--admin-vh", `${Math.round(h)}px`);
      const offsetTop = vv ? vv.offsetTop : 0;
      root.style.setProperty("--admin-vv-offset", `${Math.round(offsetTop)}px`);
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
    };
  }, []);

  return null;
}
