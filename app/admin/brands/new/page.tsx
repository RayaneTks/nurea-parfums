import type { Metadata } from "next";
import { AdminBrandForm } from "@/components/admin/AdminBrandForm";

export const metadata: Metadata = {
  title: "Nouvelle marque",
  robots: { index: false, follow: false },
};

export default function NewBrandPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5 sm:px-5 sm:pt-6">
      <AdminBrandForm />
    </div>
  );
}
