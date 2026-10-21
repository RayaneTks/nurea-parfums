import { OG_ALT_SITE, OG_CONTENT_TYPE, OG_SIZE, vignetteSite } from "./_og/vignettes";

/**
 * Vignette de partage du site (T17) — rendu et choix dans `_og/vignettes.tsx`.
 *
 * Node plutôt qu'edge : la vignette lit sur disque le logotype, la photo et la police. Elle est
 * mise en cache par Vercel et par les robots des messageries : la latence d'un démarrage à froid
 * ne compte pas.
 */
export const runtime = "nodejs";
export const alt = OG_ALT_SITE;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return vignetteSite();
}
