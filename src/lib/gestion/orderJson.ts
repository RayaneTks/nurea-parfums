import { Prisma } from "@prisma/client";

function dec(v: Prisma.Decimal | null | undefined): Prisma.Decimal {
  if (v == null) return new Prisma.Decimal(0);
  return v;
}

type OrderWithItems = {
  id: string;
  customerName: string | null;
  customerContact?: string | null;
  orderedAt: Date;
  deliveryAt: Date | null;
  status: "PENDING" | "READY" | "DELIVERED" | "CANCELLED";
  notes: string | null;
  depositPaid: boolean;
  depositAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    orderId: string;
    perfumeId: number | null;
    quantity: number;
    note: string | null;
    volumeMl: number | null;
    unitPrice: Prisma.Decimal | null;
    unitCost: Prisma.Decimal | null;
    perfume: {
      id: number;
      name: string;
      image: string;
      brand: { id: string; name: string };
    } | null;
  }[];
  sale: { id: string; soldAt: Date } | null;
};

function computeOrderTotal(items: OrderWithItems["items"]): string {
  let sum = new Prisma.Decimal(0);
  for (const it of items) {
    sum = sum.add(dec(it.unitPrice).mul(it.quantity));
  }
  return sum.toFixed(2);
}

export function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    customerName: order.customerName,
    customerContact: order.customerContact ?? null,
    orderedAt: order.orderedAt.toISOString(),
    deliveryAt: order.deliveryAt ? order.deliveryAt.toISOString() : null,
    status: order.status,
    notes: order.notes,
    depositPaid: order.depositPaid,
    depositAmount: order.depositAmount.toString(),
    orderTotal: computeOrderTotal(order.items),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      orderId: it.orderId,
      perfumeId: it.perfumeId,
      quantity: it.quantity,
      note: it.note,
      volumeMl: it.volumeMl ?? 100,
      unitPrice: dec(it.unitPrice).toString(),
      unitCost: dec(it.unitCost).toString(),
      perfume: it.perfume,
    })),
    sale: order.sale
      ? { id: order.sale.id, soldAt: order.sale.soldAt.toISOString() }
      : null,
  };
}
