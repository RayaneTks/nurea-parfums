import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPerfumeForm } from "@/components/admin/AdminPerfumeForm";

export const metadata: Metadata = {
  title: "Nouveau parfum",
  robots: { index: false, follow: false },
};

export default function NewPerfumePage() {
  return (
    <div className="min-h-screen bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <AdminNav />
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-10">
        <AdminPerfumeForm />
      </div>
    </div>
  );
}
