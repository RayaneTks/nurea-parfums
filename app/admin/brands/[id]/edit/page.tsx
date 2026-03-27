import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminBrandEditPage } from "@/components/admin/AdminBrandEditPage";

export const metadata: Metadata = {
  title: "Modifier une marque",
  robots: { index: false, follow: false },
};

export default function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-5xl px-4 py-8 pb-32 md:px-6 md:py-10">
        <AdminBrandEditPage params={params} />
      </div>
    </>
  );
}
