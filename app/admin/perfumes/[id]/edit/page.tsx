import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPerfumeEditPage } from "@/components/admin/AdminPerfumeEditPage";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

export default function EditPerfumePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="min-h-screen bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <AdminNav />
      <div className="mx-auto max-w-[1200px] px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-4 md:px-10 md:py-10">
        <AdminPerfumeEditPage params={params} />
      </div>
    </div>
  );
}
