"use client";

import { useEffect, useRef } from "react";
import { useOptionalFeedback } from "../FeedbackProvider";
import { routes } from "../routes";
import { screenIsQuiet } from "./quiet";
import { SKIP_WAITING_MESSAGE } from "./service-worker";

/**
 * Enregistrement du service worker de la gestion (04 §14.3), monté par le shell.
 *
 * - **Production seulement.** En développement, un service worker servirait des bundles périmés à
 *   chaque rechargement : on DÉSENREGISTRE ce qui traîne (un `next dev` sur le même port qu'une
 *   installation précédente laisse sinon une app fantôme).
 * - Enregistrement après `load` : rien ne dispute la bande passante au premier écran.
 * - Une nouvelle version **attend** (`installed` + un contrôleur en place). Quand l'écran est calme
 *   — pas de brouillon, pas de champ focalisé, pas de sheet ouverte — un toast propose « Recharger ».
 *   Ignoré, il ne revient pas : la nouvelle version s'appliquera au prochain lancement à froid.
 *   Jamais de rechargement imposé en pleine vente.
 */

export const UPDATE_TOAST_MESSAGE = "Nouvelle version prête";
export const UPDATE_TOAST_ACTION = "Recharger";

/**
 * Le script est servi à la RACINE — un worker ne contrôle jamais plus que son propre répertoire — et
 * son scope est demandé explicitement : la gestion, et elle seule. La vitrine n'a pas de worker.
 */
const SCRIPT_URL = "/admin-sw.js";
const SCOPE = `${routes.accueil()}/`;

/** Rythme auquel on re-teste le calme de l'écran quand une version attend. */
const QUIET_POLL_MS = 4_000;

export function ServiceWorkerRegistrar() {
  const feedback = useOptionalFeedback();
  // Le provider change d'identité à chaque toast ; la boucle d'enregistrement ne doit pas se relancer
  // pour autant — d'où la référence, mise à jour dans un effet et lue seulement hors rendu.
  const feedbackRef = useRef(feedback);
  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;

    if (process.env.NODE_ENV !== "production") {
      void container.getRegistrations().then((registrations) => {
        for (const registration of registrations) void registration.unregister();
      });
      return;
    }

    let cancelled = false;
    let announced = false;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    let reloading = false;

    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    container.addEventListener("controllerchange", reload);

    /** Propose « Recharger » dès que l'écran est calme ; réessaie tant qu'il ne l'est pas. */
    const announce = (waiting: ServiceWorker) => {
      if (cancelled || announced) return;
      const storage = safeLocalStorage();
      if (!screenIsQuiet(document, storage)) {
        quietTimer = setTimeout(() => announce(waiting), QUIET_POLL_MS);
        return;
      }
      const showToast = feedbackRef.current?.showToast;
      if (!showToast) {
        // Hors du shell (écran de connexion) : rien à proposer, la version s'appliquera à froid.
        quietTimer = setTimeout(() => announce(waiting), QUIET_POLL_MS);
        return;
      }
      announced = true;
      showToast({
        message: UPDATE_TOAST_MESSAGE,
        duration: 0,
        actionLabel: UPDATE_TOAST_ACTION,
        onAction: () => waiting.postMessage(SKIP_WAITING_MESSAGE),
      });
    };

    const watch = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) announce(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // `controller` présent : ce n'est pas la première installation, c'est une mise à jour.
          if (installing.state === "installed" && navigator.serviceWorker.controller) announce(installing);
        });
      });
    };

    const register = () => {
      void container
        .register(SCRIPT_URL, { scope: SCOPE })
        .then((registration) => {
          if (cancelled) return;
          watch(registration);
        })
        .catch(() => {
          // Enregistrement refusé (mode privé, réglage du navigateur) : l'app marche, sans hors ligne.
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      cancelled = true;
      if (quietTimer) clearTimeout(quietTimer);
      container.removeEventListener("controllerchange", reload);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Navigation privée, stockage refusé : pas de brouillon lisible, donc pas d'obstacle au toast.
    return null;
  }
}
