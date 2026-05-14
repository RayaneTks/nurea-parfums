import { Badge } from "@/ui/primitives/Badge";
import type { OrderStatus } from "@prisma/client";

const map: Record<
  OrderStatus,
  { label: string; tone: "warning" | "success" | "neutral" | "danger" }
> = {
  PENDING: { label: "En attente", tone: "warning" },
  READY: { label: "À traiter", tone: "success" },
  DELIVERED: { label: "Livrée", tone: "neutral" },
  CANCELLED: { label: "Annulée", tone: "danger" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = map[status];
  return (
    <Badge tone={m.tone} dot size="sm">
      {m.label}
    </Badge>
  );
}
