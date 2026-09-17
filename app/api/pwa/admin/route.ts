import { NextResponse } from "next/server";
import { PREPROD_NAME_SUFFIX, isPreprod } from "@/app-shell/preprod";
import { getAdminWebManifest } from "@/lib/pwa/manifests";

/** `NUREA_ENV` se lit à la requête : un manifeste figé au build ignorerait l'environnement réel. */
export const dynamic = "force-dynamic";

/**
 * Manifeste PWA installé depuis une page `/admin/*` (raccourci = ouverture sur `/admin`).
 * En préproduction, le nom est suffixé « (essai) » (07 §1.3, garde-fou 6).
 */
export function GET() {
  const manifest = getAdminWebManifest({ nameSuffix: isPreprod() ? PREPROD_NAME_SUFFIX : "" });
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "CDN-Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
