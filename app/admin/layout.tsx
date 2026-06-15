import type { Metadata, Viewport } from "next";
import "@/design/globals.admin.css";
import { AdminShell } from "@/app-shell";
import { SITE_NAME } from "@/lib/site";

const adminThemeColor = "#7B0B1D";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  applicationName: `${SITE_NAME} — Gestion`,
  manifest: "/api/pwa/admin",
  appleWebApp: {
    capable: true,
    title: `${SITE_NAME} — Gestion`,
    statusBarStyle: "black-translucent",
    startupImage: [],
  },
  icons: {
    icon: "/branding/monogram/np-circle-bordeaux.png",
    apple: { url: "/branding/monogram/np-circle-bordeaux.png", sizes: "512x512" },
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: adminThemeColor },
    { media: "(prefers-color-scheme: dark)", color: adminThemeColor },
  ],
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
