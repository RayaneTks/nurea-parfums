import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Administration — catalogue",
  robots: { index: false, follow: false },
};

export default function AdminCataloguePage() {
  return <AdminDashboard />;
}
