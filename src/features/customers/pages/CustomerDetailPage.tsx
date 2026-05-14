import { notFound } from "next/navigation";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { getCustomerById } from "@/server/customers/queries";
import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import { CustomerDetailClient } from "../components/CustomerDetailClient";

export async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const rawOrders = await prisma.order.findMany({
    where: { customerId: id },
    orderBy: { orderedAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderedAt: true,
      status: true,
      items: { select: { unitPrice: true, quantity: true } },
    },
  });

  const orders = rawOrders.map((o) => {
    const total = o.items.reduce<Decimal>(
      (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
      new Decimal(0),
    );
    return {
      id: o.id,
      orderedAt: o.orderedAt.toISOString(),
      total: total.toFixed(2),
      status: o.status,
    };
  });

  return (
    <PageScaffold padding={4} ariaLabel="Fiche client">
      <CustomerDetailClient customer={customer} orders={orders} />
    </PageScaffold>
  );
}
