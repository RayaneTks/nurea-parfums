import type { Metadata } from "next";
import { AdminBrandForm } from "@/components/admin/AdminBrandForm";

export const metadata: Metadata = {
  title: "Nouvelle marque",
  robots: { index: false, follow: false },
};

export default function NewBrandPage() {
  return <AdminBrandForm />;
}
