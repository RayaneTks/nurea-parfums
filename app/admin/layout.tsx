import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const viewport: Viewport = {
  themeColor: "#FAF6F2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  manifest: "/admin/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Admin Nuréa",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="admin-theme min-h-dvh [--admin-bg:#FAF6F2] [--admin-surface:#FDFCFA] [--admin-elevated:#F4EFEA] [--admin-text:#1A1215] [--admin-muted:#5C4F55] [--admin-border:rgba(80,20,20,0.12)] [--admin-accent:#8B3A3A] [--admin-accent-solid:#7A3030] [--admin-tab-bg:#FDFCFA] [--admin-danger:#A33030] [--admin-success:#2D6A4F]"
      style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
    >
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </div>
  );
}
