import type { Metadata } from "next";
import { OrderDetailPage } from "@/features/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commande — Admin",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ id: string }> };

export default function Page(props: Params) {
  return <OrderDetailPage {...props} />;
}
