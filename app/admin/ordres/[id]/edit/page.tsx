import type { Metadata } from "next";
import { EditOrderClient } from "@/components/admin/gestion/EditOrderClient";

export const metadata: Metadata = {
  title: "Administration — Modifier Commande",
  robots: { index: false, follow: false },
};

export default function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EditOrderClient params={params} />;
}
