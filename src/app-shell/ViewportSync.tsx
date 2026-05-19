"use client";

import { useEffect } from "react";

/**
 * Focus handler natif iOS — pas de listener visualViewport ni de manipulation
 * dynamique des hauteurs/top (qui causent un double décalage en PWA iOS).
 *
 * Tout est géré par CSS stable (100dvh, position:fixed, overflow). Seul ce
 * focus handler ajuste légèrement le scroll pour que l'input reste visible.
 *
 * - `block: 'nearest'` : iOS scroll le minimum nécessaire (pas de remontée
 *   excessive du composant comme avec 'center').
 * - 80ms : iOS a juste commencé à monter le clavier, on glisse l'input dans
 *   la vue sans entrer en conflit avec l'animation.
 */
export function ViewportSync() {
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;
      const inputType = (target as HTMLInputElement).type;
      if (
        inputType === "checkbox" ||
        inputType === "radio" ||
        inputType === "button" ||
        inputType === "submit" ||
        inputType === "file"
      )
        return;

      setTimeout(() => {
        if (document.activeElement !== target) return;
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 80);
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return null;
}
