"use client";

import { useEffect, useRef } from "react";
import { useConfirm } from "@/app-shell/FeedbackProvider";

export const ABANDON_TITLE = "Abandonner la saisie ?";
export const ABANDON_DESCRIPTION = "Tes modifications ne seront pas enregistrées.";

/**
 * « Abandonner la saisie ? » avant de quitter un formulaire modifié (06 E17, E19 ; S18).
 *
 * Retour du header, onglets et liens de l'écran sont des liens : un écouteur en phase de CAPTURE sur le
 * document les intercepte avant React (et donc avant la navigation du shell) tant que la saisie est
 * modifiée ; « Abandonner » rejoue le même toucher, sans garde. Un rechargement ou une fermeture d'onglet
 * passe par la boîte native du navigateur.
 */
export function useLeaveGuard(dirty: boolean) {
  const confirm = useConfirm();
  const bypass = useRef(false);

  useEffect(() => {
    if (!dirty) return;

    const onClick = (event: MouseEvent) => {
      if (bypass.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.closest("[data-leave-guard-ignore]")) return;
      event.preventDefault();
      event.stopPropagation();
      void confirm({
        title: ABANDON_TITLE,
        description: ABANDON_DESCRIPTION,
        confirmLabel: "Abandonner",
        cancelLabel: "Continuer la saisie",
        tone: "danger",
      }).then((leave) => {
        if (!leave) return;
        bypass.current = true;
        anchor.click();
        bypass.current = false;
      });
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, confirm]);

  /** À appeler juste avant une navigation voulue (après enregistrement, suppression). */
  return {
    release() {
      bypass.current = true;
      window.setTimeout(() => {
        bypass.current = false;
      }, 0);
    },
  };
}
