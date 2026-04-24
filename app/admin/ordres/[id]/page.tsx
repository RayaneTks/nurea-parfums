import type { Metadata } from "next";
import { OrderDetailView } from "@/components/admin/OrderDetailView";

export const metadata: Metadata = {
  title: "Administration — Ordre",
  robots: { index: false, follow: false },
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderDetailView params={params} />;
}
