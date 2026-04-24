import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const viewport: Viewport = {
  themeColor: "#121014",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  manifest: "/admin/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Admin Nuréa",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="admin-theme scheme-dark min-h-dvh [--admin-bg:#121014] [--admin-surface:#1A171C] [--admin-elevated:#242026] [--admin-input-bg:#141218] [--admin-text:#EDE9E6] [--admin-muted:#9A9299] [--admin-border:rgba(232,224,216,0.12)] [--admin-accent:#D88080] [--admin-accent-solid:#C46F6F] [--admin-tab-bg:#161418] [--admin-tab-active:rgba(216,128,128,0.14)] [--admin-danger:#E07A7A] [--admin-success:#7BC9A4] [--admin-overlay:rgba(10,8,11,0.78)] [--admin-ring-offset:#1A171C]"
      style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
    >
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </div>
  );
}
