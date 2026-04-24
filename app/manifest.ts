import type { MetadataRoute } from "next";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
} from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/admin/login",
    display: "standalone",
    background_color: "#F7F4F1",
    theme_color: "#7F3038",
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
}
