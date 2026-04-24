import type { Metadata } from "next";
import { OrdersView } from "@/components/admin/OrdersView";

export const metadata: Metadata = {
  title: "Administration — Ordres",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersView />;
}
