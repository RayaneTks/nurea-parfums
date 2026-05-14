import { notFound } from "next/navigation";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { getOrderForDetail } from "@/server/orders/queries";
import { computeOrderBalance, listPaymentsForOrder } from "@/server/orders/payments";
import { BalancePanel } from "@/components/admin/orders/BalancePanel";
import { OrderDetailClient } from "../components/OrderDetailClient";

export async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderForDetail(id);
  if (!order) notFound();

  const [balance, payments] = await Promise.all([
    computeOrderBalance(id),
    listPaymentsForOrder(id),
  ]);
  if (!balance) notFound();

  return (
    <PageScaffold padding={4} ariaLabel="Détail commande">
      <OrderDetailClient
        order={order}
        balanceSlot={
          <BalancePanel orderId={id} initialBalance={balance} initialPayments={payments} />
        }
      />
    </PageScaffold>
  );
}
