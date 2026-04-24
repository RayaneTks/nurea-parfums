import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Administration — catalogue",
  robots: { index: false, follow: false },
};

export default function AdminCataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 px-4 text-[var(--admin-muted)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent-solid)]" aria-hidden />
          <p className="text-sm font-medium">Chargement du catalogue…</p>
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}
