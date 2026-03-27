import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBrandForm } from "@/components/admin/AdminBrandForm";

export const metadata: Metadata = {
  title: "Nouvelle marque",
  robots: { index: false, follow: false },
};

export default function NewBrandPage() {
  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-5xl px-4 py-8 pb-32 md:px-6 md:py-10">
        <AdminBrandForm />
      </div>
    </>
  );
}
