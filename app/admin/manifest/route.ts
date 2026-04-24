import { NextResponse } from "next/server";

/** PWA admin : standalone, scope /admin, thème aligné sur iOS sombre (noir système). */
export async function GET() {
  const body = {
    name: "Admin",
    short_name: "Admin",
    description: "Administration Nuréa Parfums",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#000000",
    theme_color: "#000000",
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
