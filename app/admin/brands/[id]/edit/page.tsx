import type { Metadata } from "next";
import { AdminBrandEditPage } from "@/components/admin/AdminBrandEditPage";

export const metadata: Metadata = {
  title: "Modifier une marque",
  robots: { index: false, follow: false },
};

export default function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5 sm:px-5 sm:pt-6">
      <AdminBrandEditPage params={params} />
    </div>
  );
}
