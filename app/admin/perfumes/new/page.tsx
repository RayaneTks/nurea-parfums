import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPerfumeForm } from "@/components/admin/AdminPerfumeForm";

export const metadata: Metadata = {
  title: "Nouveau parfum",
  robots: { index: false, follow: false },
};

export default function NewPerfumePage() {
  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-3xl px-4 py-6 pb-32 md:py-10">
        <AdminPerfumeForm />
      </div>
    </>
  );
}
