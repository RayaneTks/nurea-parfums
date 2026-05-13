import type { Metadata, Viewport } from "next";
import { AdminShellClient } from "@/components/admin/shell/AdminShellClient";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  /**
   * Remplace le manifeste vitrine : « Ajouter à l’écran d’accueil » depuis
   * une page /admin lance l’app sur `/admin` (ex. `app/admin/page` → catalogue).
   */
  manifest: "/api/pwa/admin",
  appleWebApp: {
    capable: true,
    title: `${SITE_NAME} — Gestion`,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#7B0B1D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="antialiased">
      <AdminShellClient>{children}</AdminShellClient>
    </div>
  );
}
