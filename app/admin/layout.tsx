import type { Metadata, Viewport } from "next";
import "@/design/globals.admin.css";
import { AdminShell } from "@/app-shell";
import { ADMIN_STARTUP_IMAGES } from "@/lib/pwa/admin-splash";
import { SITE_NAME } from "@/lib/site";

/**
 * Couleur de la barre d'état iOS en mode standalone.
 *
 * Volontairement l'arrière-plan de l'app (et non le bordeaux de marque) :
 * avec `statusBarStyle: "default"` iOS écrit l'heure en NOIR, illisible sur
 * bordeaux. Le bordeaux reste la couleur de l'écran de lancement
 * (`background_color` du manifeste) et de l'icône.
 */
const adminStatusBarColor = "#F2F2F7";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  applicationName: `${SITE_NAME} — Gestion`,
  title: {
    default: `${SITE_NAME} — Gestion`,
    template: "%s — Gestion",
  },
  manifest: "/api/pwa/admin",
  appleWebApp: {
    capable: true,
    title: "Nuréa Gestion",
    statusBarStyle: "default",
    startupImage: [...ADMIN_STARTUP_IMAGES],
  },
  // Les icônes viennent des fichiers `app/admin/icon.png` et
  // `app/admin/apple-icon.png` (les conventions de fichier ont priorité sur
  // `metadata.icons`, d'où l'absence de champ ici).
  other: {
    // `appleWebApp` ci-dessus émet déjà `mobile-web-app-capable` et le style de
    // barre d'état ; seule la variante historique `apple-mobile-web-app-capable`
    // manque, et les iOS antérieurs à Safari 17 n'ouvrent en plein écran que
    // sur cette clé-là.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: adminStatusBarColor,
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Zoom autorisé (WCAG) — viewportFit cover conservé pour encoches PWA ;
  // pas de maximumScale/userScalable:false qui bloquent le pinch-zoom.
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
