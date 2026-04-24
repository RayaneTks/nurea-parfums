import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCaisseDashboard } from "@/components/admin/AdminCaisseDashboard";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Administration — caisse",
  robots: { index: false, follow: false },
};

export default function AdminCaissePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-[var(--admin-muted)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent)]" aria-hidden />
          <p className="text-sm font-medium">Chargement…</p>
        </div>
      }
    >
      <AdminCaisseDashboard />
    </Suspense>
  );
}
