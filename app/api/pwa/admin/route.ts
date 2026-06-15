import { NextResponse } from "next/server";
import { getAdminWebManifest } from "@/lib/pwa/manifests";

/**
 * Manifeste PWA installé depuis une page `/admin/*` (raccourci = ouverture sur `/admin`).
 */
export function GET() {
  return NextResponse.json(getAdminWebManifest(), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "CDN-Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
