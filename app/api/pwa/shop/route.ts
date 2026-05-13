import { NextResponse } from "next/server";
import { getShopWebManifest } from "@/lib/pwa/manifests";

/**
 * Manifeste PWA du site public (raccourci = ouverture sur `/`).
 */
export function GET() {
  return NextResponse.json(getShopWebManifest(), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
