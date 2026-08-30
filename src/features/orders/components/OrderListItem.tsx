"use client";

import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { ListRow } from "@/ui/primitives/ListRow";
import { Money } from "@/ui/patterns/Money";
import { RelativeTime } from "@/ui/patterns/RelativeTime";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { OrderListRow } from "@/server/orders/queries";

type OrderListItemProps = {
  order: OrderListRow;
  /**
   * Masque la pastille de statut. À activer quand la liste est déjà groupée
   * par statut : répéter « À traiter » sur les huit lignes d'une section
   * intitulée « À traiter » n'ajoute rien et encombre la colonne de droite.
   */
  hideStatus?: boolean;
};

export function OrderListItem({ order, hideStatus = false }: OrderListItemProps) {
  const dueNum = Number(order.due);
  const showDueBadge = dueNum > 0.01 && order.status !== "CANCELLED";

  return (
    <ListRow
      href={`/admin/ordres/${order.id}`}
      leading={<Avatar name={order.customerName} size="md" />}
      primary={
        <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
          {order.customerName}
        </span>
      }
      secondary={
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--admin-text-subtle)]">
          {/* Pas de « Pas de date » : l'absence de date de livraison est le
              cas courant, l'annoncer sur chaque ligne n'informe de rien. */}
          {order.deliveryAt ? (
            <span className="tnum">
              Livraison <RelativeTime date={order.deliveryAt} />
            </span>
          ) : null}
          {order.deliveryAt && showDueBadge ? <span aria-hidden>·</span> : null}
          {showDueBadge ? (
            <span className="font-medium text-[var(--admin-warning)]">
              <Money value={order.due} compact /> dû
            </span>
          ) : null}
          {!order.deliveryAt && !showDueBadge ? (
            <span>Soldée</span>
          ) : null}
        </span>
      }
      trailing={
        <div className="flex flex-col items-end gap-1">
          <Money value={order.total} bold />
          <div className="flex items-center gap-1">
            {order.fulfillment === "partial" && order.status !== "DELIVERED" ? (
              <Badge tone="warning" size="sm">
                Partiel
              </Badge>
            ) : null}
            {hideStatus ? null : <OrderStatusBadge status={order.status} />}
          </div>
        </div>
      }
      chevron
      ariaLabel={`Commande de ${order.customerName}`}
    />
  );
}
