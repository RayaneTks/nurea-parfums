import type { Metadata } from "next";
import { AdminCaisseDashboard } from "@/components/admin/AdminCaisseDashboard";

export const metadata: Metadata = {
  title: "Administration — caisse",
  robots: { index: false, follow: false },
};

export default function AdminCaissePage() {
  return <AdminCaisseDashboard />;
}
