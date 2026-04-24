import { NextResponse } from "next/server";

/** Manifest PWA dédié à l’admin (thème clair, démarrage sur l’accueil admin). */
export async function GET() {
  const body = {
    name: "Nuréa — Administration",
    short_name: "Admin Nuréa",
    description: "Espace d’administration catalogue Nuréa Parfums",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF6F2",
    theme_color: "#FAF6F2",
    lang: "fr",
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
