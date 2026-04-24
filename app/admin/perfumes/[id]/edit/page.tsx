import type { Metadata } from "next";
import { AdminPerfumeEditPage } from "@/components/admin/AdminPerfumeEditPage";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

export default function EditPerfumePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5 sm:px-5 sm:pt-6">
      <AdminPerfumeEditPage params={params} />
    </div>
  );
}
