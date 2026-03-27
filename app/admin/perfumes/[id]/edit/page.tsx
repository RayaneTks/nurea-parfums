import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPerfumeEditPage } from "@/components/admin/AdminPerfumeEditPage";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

export default function EditPerfumePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-5xl px-4 py-8 pb-32 md:px-6 md:py-10">
        <AdminPerfumeEditPage params={params} />
      </div>
    </>
  );
}
