import type { Metadata } from "next";
import { AdminPerfumeEditPage } from "@/components/admin/AdminPerfumeEditPage";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

export default function EditPerfumePage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminPerfumeEditPage params={params} />;
}
