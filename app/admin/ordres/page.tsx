import type { Metadata } from "next";
import { OrdersPage } from "@/features/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commandes — Admin",
  robots: { index: false, follow: false },
};

type Params = { searchParams: Promise<{ filter?: string }> };

export default function Page(props: Params) {
  return <OrdersPage {...props} />;
}
