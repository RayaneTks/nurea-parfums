import type { Metadata, Viewport } from "next";
import { AdminShellClient } from "@/components/admin/shell/AdminShellClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#7F3038",
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
