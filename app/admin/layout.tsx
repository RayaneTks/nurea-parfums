import type { Metadata, Viewport } from "next";
import "@/design/globals.admin.css";
import { AdminShell } from "@/app-shell";
import { SITE_NAME } from "@/lib/site";

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
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
