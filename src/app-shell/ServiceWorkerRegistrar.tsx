"use client";

import { useEffect } from "react";

/**
 * Enregistre `public/admin-sw.js` sur le scope `/admin/`.
 *
 * Désenregistré automatiquement en développement : un SW actif y sert des
 * bundles périmés après chaque rebuild.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined);
      return;
    }

    const register = () => {
      void navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin/" })
        .catch(() => undefined);
    };

    // Après `load` : l'enregistrement ne dispute pas la bande passante au
    // premier rendu.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
