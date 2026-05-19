"use client";

import { useEffect } from "react";

/**
 * Synchronise `--admin-vh`, `--admin-keyboard-h` et `--admin-vv-offset` avec
 * `visualViewport` (hauteur réelle visible quand le clavier overlay).
 *
 * Centre AUTOMATIQUEMENT l'input focused dans la zone visible :
 * - iOS PWA standalone ne scroll PAS toujours l'input dans la vue
 * - On force un `scrollIntoView({block: "center"})` après que le clavier soit
 *   stable (~280ms) sur tout focus d'input/textarea/select
 * - Ignoré pour les inputs DANS un vaul drawer (gestion propre du drawer)
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

    /* Centre l'input focused dans la zone visible.
       Norme iOS native : le clavier overlay, l'input reste centré-haut visible. */
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
      /* Évite les inputs dans un drawer vaul — le drawer gère son scroll. */
      if (target.closest("[data-vaul-drawer]")) return;
      /* Évite les checkbox / radio / bouton-style inputs */
      const inputType = (target as HTMLInputElement).type;
      if (inputType === "checkbox" || inputType === "radio" || inputType === "button" || inputType === "submit") return;

      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        if (document.activeElement !== target) return;
        /* Centre l'input actif dans l'espace visible restant.
           scroll-margin-top/bottom (globals.admin.css) compensent header
           sticky + clavier pour que "center" soit réellement la zone
           visible et non le layout viewport complet. */
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 320);
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      } else {
        window.removeEventListener("resize", apply);
        window.removeEventListener("orientationchange", apply);
      }
      document.removeEventListener("focusin", onFocusIn);
      if (focusTimer) clearTimeout(focusTimer);
      root.style.removeProperty("--admin-vh");
      root.style.removeProperty("--admin-vv-offset");
      root.style.removeProperty("--admin-keyboard-h");
      root.classList.remove("admin-keyboard-open");
    };
  }, []);

  return null;
}
