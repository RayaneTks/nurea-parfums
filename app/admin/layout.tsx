import type { Metadata, Viewport } from "next";
import "@/design/globals.admin.css";
import { AdminShell } from "@/app-shell";
import { SITE_NAME } from "@/lib/site";
import { ToastProvider } from "@/ui/providers/ToastProvider";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  /*
   * Dit à iOS (Safari 16.4+) de RÉDIMENSIONNER le viewport quand le
   * clavier s'ouvre (au lieu de juste l'overlayer). 100dvh devient
   * donc la hauteur visible au-dessus du clavier — la TabBar et les
   * sheets vaul restent visibles, l'input focusé n'est plus caché.
   */
  interactiveWidget: "resizes-content",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
