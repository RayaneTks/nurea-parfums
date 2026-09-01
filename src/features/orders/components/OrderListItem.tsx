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
  const totalNum = Number(order.total);
  const reste = dueNum > 0.01 && order.status !== "CANCELLED";
  /*
   * Le total ne s'affiche que s'il diffère du reste dû.
   *
   * Sur une commande sans acompte — le cas le plus fréquent — les deux sont
   * égaux, et la ligne montrait alors deux fois le même nombre. Le total
   * n'apprend quelque chose que lorsqu'une partie est déjà rentrée.
   */
  const totalUtile = reste && Math.abs(totalNum - dueNum) > 0.01;

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
          {order.deliveryAt && totalUtile ? <span aria-hidden>·</span> : null}
          {/*
            Le total passe en second quand il reste quelque chose à encaisser.
            La colonne de droite portait le total en gras et le reste dû en
            petit : sur une commande impayée, le chiffre mis en avant était
            celui qu'on connaît déjà, pendant que le seul qui appelle une
            action tenait en douze pixels — et les deux étaient souvent égaux,
            donc la ligne affichait deux fois le même nombre.
          */}
          {totalUtile ? (
            <span className="tnum">
              <Money value={order.total} compact /> au total, {" "}
              <Money value={totalNum - dueNum} compact /> déjà reçus
            </span>
          ) : null}
          {!order.deliveryAt && !reste ? <span>Soldée</span> : null}
        </span>
      }
      trailing={
        <div className="flex flex-col items-end gap-1">
          {reste ? (
            <>
              <Money value={order.due} compact bold tone="warning" className="text-[17px]" />
              <span className="text-[11px] font-medium text-[var(--admin-warning)]">
                à encaisser
              </span>
            </>
          ) : (
            <Money value={order.total} compact tone="muted" />
          )}
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
