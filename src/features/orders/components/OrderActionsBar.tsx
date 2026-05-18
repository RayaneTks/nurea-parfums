"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Pencil, ShoppingBag } from "lucide-react";
import { Button } from "@/ui/primitives/Button";
import { HStack, Stack } from "@/ui/primitives/Stack";
import type { OrderDetailRow } from "@/server/orders/queries";
import { OrderStatusSheet } from "./OrderStatusSheet";

type OrderActionsBarProps = {
  order: OrderDetailRow;
};

export function OrderActionsBar({ order }: OrderActionsBarProps) {
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  const canFinalize =
    order.status === "READY" && Number(order.due) <= 0.01 && !order.hasSale;
  const canEdit = order.status !== "DELIVERED" && order.status !== "CANCELLED";
  const canChangeStatus = !(order.status === "DELIVERED" && order.hasSale);

  return (
    <>
      <Stack gap={2}>
        <HStack gap={2}>
          {canEdit ? (
            <Link href={`/admin/ordres/${order.id}/edit`} className="flex-1">
              <Button variant="secondary" size="lg" fullWidth leadingIcon={<Pencil size={16} />}>
                Modifier
              </Button>
            </Link>
          ) : null}
          {canFinalize ? (
            <Link href={`/admin/vendre?fromOrder=${order.id}`} className="flex-1">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leadingIcon={<ShoppingBag size={16} />}
              >
                Finaliser la vente
              </Button>
            </Link>
          ) : null}
        </HStack>
        {canChangeStatus ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            leadingIcon={<ArrowRightLeft size={14} />}
            onClick={() => setStatusOpen(true)}
          >
            Changer le statut
          </Button>
        ) : null}
      </Stack>
      <OrderStatusSheet
        open={statusOpen}
        onOpenChange={setStatusOpen}
        orderId={order.id}
        currentStatus={order.status}
        hasSale={order.hasSale}
        onChanged={() => router.refresh()}
      />
    </>
  );
}
