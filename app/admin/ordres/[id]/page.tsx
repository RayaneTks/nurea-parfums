import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/admin/OrderDetailView";
import { BalancePanel } from "@/components/admin/orders/BalancePanel";
import { computeOrderBalance, listPaymentsForOrder } from "@/server/orders/payments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration — Commande",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const balance = await computeOrderBalance(id);
  if (!balance) notFound();
  const payments = await listPaymentsForOrder(id);

  return (
    <>
      <OrderDetailView params={Promise.resolve({ id })} />
      <div className="px-5 pb-4">
        <BalancePanel orderId={id} initialBalance={balance} initialPayments={payments} />
      </div>
    </>
  );
}
