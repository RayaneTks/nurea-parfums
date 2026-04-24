import type { Metadata } from "next";
import { AdminPerfumeForm } from "@/components/admin/AdminPerfumeForm";

export const metadata: Metadata = {
  title: "Nouveau parfum",
  robots: { index: false, follow: false },
};

export default function NewPerfumePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5 sm:px-5 sm:pt-6">
      <AdminPerfumeForm />
    </div>
  );
}
