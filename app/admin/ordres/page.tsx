import type { Metadata } from "next";
import { NureaOrdersPage } from "@/components/admin/nurea/OrdersPage";

export const metadata: Metadata = {
  title: "Administration — Commandes",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <NureaOrdersPage />;
}
