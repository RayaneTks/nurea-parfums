import { renderServiceWorker } from "@/app-shell/pwa/service-worker";
import { BUILD_ID } from "@/server/env";

/**
 * `GET /admin-sw.js` — le service worker de la gestion (04 §14.3).
 *
 * Servi à la RACINE : un script contrôle au plus son propre répertoire, et c'est de là qu'il peut
 * prendre le scope `/admin/` demandé par le registrar.
 *
 * Version = `BUILD_ID` (identifiant du déploiement Vercel, « local » ailleurs) : chaque déploiement
 * change les octets du script, donc le navigateur installe une nouvelle version — qui attend.
 * `no-cache` : le navigateur revalide à chaque contrôle de mise à jour, sans quoi un script gardé
 * 24 h par un intermédiaire retarderait d'autant la bascule.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(renderServiceWorker(BUILD_ID), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
