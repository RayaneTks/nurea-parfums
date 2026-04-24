import type { Metadata } from "next";
import { AdminBrandEditPage } from "@/components/admin/AdminBrandEditPage";

export const metadata: Metadata = {
  title: "Modifier une marque",
  robots: { index: false, follow: false },
};

export default function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminBrandEditPage params={params} />;
}
