import type { Metadata } from "next";
import { AdminPerfumeForm } from "@/components/admin/AdminPerfumeForm";

export const metadata: Metadata = {
  title: "Nouveau parfum",
  robots: { index: false, follow: false },
};

export default function NewPerfumePage() {
  return <AdminPerfumeForm />;
}
