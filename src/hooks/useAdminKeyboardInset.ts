"use client";

import { useEffect } from "react";

const ROOT_VAR = "--admin-keyboard-inset";

/**
 * Mesure l'inset clavier iOS (visualViewport) et expose `--admin-keyboard-inset`
 * sur `document.documentElement` pour les CTA sticky / sheets.
 */
export function useAdminKeyboardInset() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    const sync = () => {
      if (!vv) {
        root.style.setProperty(ROOT_VAR, "0px");
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty(ROOT_VAR, `${Math.round(inset)}px`);
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      root.style.removeProperty(ROOT_VAR);
    };
  }, []);
}
