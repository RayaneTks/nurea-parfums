"use client";

import { useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { Card } from "@/ui/primitives/Card";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { statusLabel } from "@/domain/order-status";
import type { OrderDetailRow } from "@/server/orders/queries";
import { useOrderStatusChange } from "../hooks/useOrderStatusChange";

const EDITABLE_STATUSES = ["PENDING", "READY", "DELIVERED"] as const;
type EditableStatus = (typeof EDITABLE_STATUSES)[number];

const STATUS_OPTIONS = EDITABLE_STATUSES.map((value) => ({
  value,
  label: statusLabel(value),
}));

function isEditableStatus(s: OrderStatus): s is EditableStatus {
  return (EDITABLE_STATUSES as readonly string[]).includes(s);
}

type OrderStatusControlProps = {
  order: OrderDetailRow;
  onStatusChange: (next: OrderStatus) => void;
  onError: (message: string) => void;
};

export function OrderStatusControl({ order, onStatusChange, onError }: OrderStatusControlProps) {
  const [pending, startTransition] = useTransition();

  /*
   * La cible ET la réserve à afficher viennent du domaine plutôt que d'une
   * table écrite ici : c'est lui qui sait ce qui cloche — solde restant,
   * absence d'acompte, vente rattachée — et une copie locale finirait par
   * annoncer autre chose que ce qui est réellement vérifié.
   */
  const status = useOrderStatusChange({
    order,
    onApplied: (next) => startTransition(() => onStatusChange(next)),
    onError,
  });

  /*
   * Une commande annulée garde son sélecteur, sans segment actif.
   *
   * L'écran le retirait entièrement : la commande restait visible dans la
   * liste sous « Annulées », mais sa fiche n'offrait plus aucun geste pour la
   * ramener — un cul-de-sac silencieux, alors que le domaine autorise
   * explicitement le retour, avec réserve.
   */
  const cancelled = !isEditableStatus(order.status);

  return (
    <>
      <Card padding={3}>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
          Statut
        </p>
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={cancelled ? ("" as EditableStatus) : (order.status as EditableStatus)}
          onChange={(next) => status.request(next)}
          ariaLabel="Changer le statut de la commande"
        />
        {pending ? (
          <p className="mt-2 text-[12px] text-[var(--admin-text-subtle)]">Mise à jour…</p>
        ) : null}
        <p className="mt-2 text-[12px] leading-snug text-[var(--admin-text-subtle)]">
          {cancelled
            ? "Cette commande est annulée. Choisis un statut pour la remettre dans le suivi."
            : "Pour annuler une commande, utilise « Supprimer la commande » en bas de page."}
        </p>
      </Card>

      {status.confirmTarget ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) status.dismissConfirm();
          }}
          title={status.confirmTitle}
          description={status.confirmTarget.reserve}
          confirmLabel="Confirmer"
          tone="primary"
          onConfirm={status.confirmAction}
        />
      ) : null}
    </>
  );
}
