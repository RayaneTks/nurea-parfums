import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { OrderForm } from "@/components/admin/orders/OrderForm";
import type { OrderFormLine } from "@/components/admin/orders/OrderForm/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier commande — Admin",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isVolume(v: number): v is 30 | 50 | 100 {
  return v === 30 || v === 50 || v === 100;
}

export default async function EditOrderPage({ params }: { params: Params }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      customerId: true,
      customerName: true,
      deliveryAt: true,
      notes: true,
      customer: { select: { id: true, fullName: true, phoneE164: true } },
      items: {
        select: {
          id: true,
          perfumeId: true,
          quantity: true,
          volumeMl: true,
          unitPrice: true,
          unitCostDzd: true,
          exchangeRate: true,
          note: true,
          perfumeSnapshot: true,
          perfume: {
            select: {
              id: true,
              name: true,
              image: true,
              brand: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!order) notFound();

  const items: OrderFormLine[] = order.items.map((it) => {
    const snap =
      it.perfumeSnapshot && typeof it.perfumeSnapshot === "object"
        ? (it.perfumeSnapshot as { name?: string; brandName?: string; image?: string })
        : null;
    return {
      key: `loaded-${it.id}`,
      perfumeId: it.perfumeId,
      snapshot: {
        name: it.perfume?.name ?? snap?.name ?? "Hors catalogue",
        brandName: it.perfume?.brand.name ?? snap?.brandName ?? "—",
        image: it.perfume?.image ?? snap?.image ?? null,
      },
      quantity: it.quantity,
      volumeMl: isVolume(it.volumeMl) ? it.volumeMl : 100,
      unitPrice: it.unitPrice.toString(),
      unitCostDzd: it.unitCostDzd?.toString() ?? "",
      exchangeRate: it.exchangeRate?.toString() ?? "277",
      note: it.note ?? "",
    };
  });

  return (
    <OrderForm
      mode="edit"
      orderId={order.id}
      initial={{
        customer: order.customer
          ? {
              id: order.customer.id,
              fullName: order.customer.fullName,
              phoneE164: order.customer.phoneE164,
            }
          : null,
        customerName: order.customerName ?? "",
        deliveryAt: toDatetimeLocal(order.deliveryAt),
        notes: order.notes ?? "",
        items,
      }}
    />
  );
}
