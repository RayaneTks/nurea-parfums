"use client";

import Link from "next/link";
import { Pencil, ShoppingBag } from "lucide-react";
import { Button } from "@/ui/primitives/Button";
import { HStack } from "@/ui/primitives/Stack";
import type { OrderDetailRow } from "@/server/orders/queries";

type OrderActionsBarProps = {
  order: OrderDetailRow;
};

export function OrderActionsBar({ order }: OrderActionsBarProps) {
  const canFinalize =
    order.status === "READY" && Number(order.due) <= 0.01 && !order.hasSale;
  const canEdit = order.status !== "DELIVERED" && order.status !== "CANCELLED";
  return (
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
  );
}
