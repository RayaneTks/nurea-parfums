import { NextResponse } from "next/server";

/** Manifest PWA admin : standalone, scope /admin, thème sombre cohérent avec la barre de statut iOS. */
export async function GET() {
  const body = {
    name: "Nuréa — Administration",
    short_name: "Admin Nuréa",
    description: "Espace d’administration catalogue Nuréa Parfums",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#121014",
    theme_color: "#121014",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/branding/monogram/np-circle-bordeaux.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/monogram/np-circle-bordeaux.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
