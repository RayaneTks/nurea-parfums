"use client";

import { useEffect } from "react";

/**
 * Synchronise `--admin-vh`, `--admin-keyboard-h` et `--admin-vv-offset`
 * avec la hauteur réelle visible (visualViewport).
 *
 * iOS Safari / PWA standalone ne met PAS à jour `100dvh` quand le clavier
 * s'ouvre : le shell reste à la hauteur plein écran et le clavier recouvre
 * les inputs. visualViewport est la seule source de vérité.
 *
 * `--admin-keyboard-h` = hauteur estimée du clavier (layout viewport height
 *  minus visual viewport height). Utilisé pour lever les sheets / modals
 *  au-dessus du clavier (`bottom: var(--admin-keyboard-h, 0px)`).
 */
export function ViewportSync() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      const keyboardH = Math.max(0, window.innerHeight - h - offsetTop);

      root.style.setProperty("--admin-vh", `${Math.round(h)}px`);
      root.style.setProperty("--admin-vv-offset", `${Math.round(offsetTop)}px`);
      root.style.setProperty("--admin-keyboard-h", `${Math.round(keyboardH)}px`);

      if (keyboardH > 60) {
        root.classList.add("admin-keyboard-open");
      } else {
        root.classList.remove("admin-keyboard-open");
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
      root.style.removeProperty("--admin-vh");
      root.style.removeProperty("--admin-vv-offset");
      root.style.removeProperty("--admin-keyboard-h");
      root.classList.remove("admin-keyboard-open");
    };
  }, []);

  return null;
}
