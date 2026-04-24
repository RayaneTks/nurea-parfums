"use client";

import { AdminBadge, type BadgeVariant } from "./AdminBadge";

export type OrderStatusValue = "PENDING" | "READY" | "DELIVERED" | "CANCELLED";

const config: Record<OrderStatusValue, { label: string; variant: BadgeVariant; dot: boolean }> = {
  PENDING: { label: "En attente", variant: "warning", dot: true },
  READY: { label: "Prête", variant: "accent", dot: true },
  DELIVERED: { label: "Livrée", variant: "success", dot: false },
  CANCELLED: { label: "Annulée", variant: "neutral", dot: false },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatusValue; className?: string }) {
  const c = config[status];
  return <AdminBadge label={c.label} variant={c.variant} dot={c.dot} className={className} />;
}

export function orderStatusLabel(status: OrderStatusValue): string {
  return config[status].label;
}
