"use client";

import { useEffect } from "react";

/**
 * Détecte uniquement l'ouverture du clavier iOS via `visualViewport`
 * et expose `--admin-keyboard-open` (0 ou 1).
 *
 * Décision iOS PWA : on NE rétrécit PAS le shell quand le clavier
 * s'ouvre. Le clavier overlaye le viewport (iOS Safari/PWA standard),
 * et iOS scrolle nativement l'input focusé dans la zone visible grâce
 * aux `scroll-margin-{top,bottom}` posés globalement sur input/textarea
 * dans `globals.admin.css`. Les sheets vaul gèrent leur repositionnement
 * via `repositionInputs={true}` (défaut).
 *
 * Ancienne version : on synchronisait `--admin-vh` avec
 * `visualViewport.height`. Mauvaise idée — ça rétrécissait le shell
 * et la sheet en plein milieu de l'animation clavier, masquant le
 * contenu et laissant une bande vide en bas de l'écran.
 */
const KEYBOARD_OPEN_THRESHOLD_PX = 150;

export function ViewportSync() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      const visibleHeight = vv ? vv.height : window.innerHeight;
      const layoutHeight = window.innerHeight;
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
      root.style.removeProperty("--admin-keyboard-open");
    };
  }, []);

  return null;
}
