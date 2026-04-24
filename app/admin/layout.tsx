import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

/**
 * Admin = app distincte du site vitrine : couleurs type iOS (mode sombre),
 * teinte système, séparateurs et surfaces « grouped » — pas la DA bordeaux public.
 */
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  manifest: "/admin/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Admin",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="admin-theme scheme-dark min-h-dvh antialiased [--admin-accent:#0A84FF] [--admin-accent-solid:#0A84FF] [--admin-accent-muted:rgba(10,132,255,0.22)] [--admin-bg:#000000] [--admin-border:rgba(84,84,86,0.36)] [--admin-danger:#FF453A] [--admin-elevated:#1C1C1E] [--admin-fill:#2C2C2E] [--admin-grouped-bg:#1C1C1E] [--admin-input-bg:#2C2C2E] [--admin-muted:#8E8E93] [--admin-overlay:rgba(0,0,0,0.55)] [--admin-ring-offset:#1C1C1E] [--admin-secondary:#8E8E93] [--admin-separator:rgba(84,84,86,0.65)] [--admin-success:#32D74B] [--admin-surface:#1C1C1E] [--admin-tab-active:rgba(58,58,60,0.95)] [--admin-tab-bg:rgba(28,28,30,0.92)] [--admin-text:#F2F2F7] [--admin-tertiary:#636366]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", sans-serif',
      }}
    >
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </div>
  );
}
