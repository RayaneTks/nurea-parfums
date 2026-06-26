"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { cn } from "@/lib/utils";
import { deriveFulfillment, type Fulfillment } from "@/domain/order-status";
import type { OrderDetailRow } from "@/server/orders/queries";

type Item = OrderDetailRow["items"][number];

type OrderItemsFulfillmentProps = {
  orderId: string;
  items: Item[];
  /** Si false, affichage seul (vente liée, commande figée). */
  editable: boolean;
  onFulfillmentChange?: (next: Fulfillment, items: Item[]) => void;
  onError?: (message: string) => void;
};

/**
 * Liste des articles avec suivi de livraison par ligne (livraison partielle).
 *
 * - Stepper −/+ (hitbox 44px) + bouton « Tout » pour livrer la ligne entière.
 * - Optimistic update, PATCH /api/admin/orders/[id]/fulfillment, rollback sur erreur.
 */
export function OrderItemsFulfillment({
  orderId,
  items: initialItems,
  editable,
  onFulfillmentChange,
  onError,
}: OrderItemsFulfillmentProps) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (items.length === 0) return null;

  const persist = (next: Item[], itemId: string, previous: Item[]) => {
    setItems(next);
    setPendingId(itemId);
    onFulfillmentChange?.(deriveFulfillment(next), next);
    startTransition(async () => {
      const target = next.find((it) => it.id === itemId);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/fulfillment`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ id: itemId, deliveredQuantity: target?.deliveredQuantity ?? 0 }],
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          setItems(previous);
          onFulfillmentChange?.(deriveFulfillment(previous), previous);
          onError?.(err.error ?? "Livraison non enregistrée.");
        }
      } catch {
        setItems(previous);
        onFulfillmentChange?.(deriveFulfillment(previous), previous);
        onError?.("Réseau indisponible. Réessaie.");
      } finally {
        setPendingId(null);
      }
    });
  };

  const setDelivered = (itemId: string, value: number) => {
    const previous = items;
    const next = items.map((it) =>
      it.id === itemId
        ? { ...it, deliveredQuantity: Math.max(0, Math.min(value, it.quantity)) }
        : it,
    );
    if (next.find((it) => it.id === itemId)?.deliveredQuantity === previous.find((it) => it.id === itemId)?.deliveredQuantity) {
      return;
    }
    persist(next, itemId, previous);
  };

  return (
    <Card padding={0}>
      <ul className="divide-y px-3" style={{ borderColor: "var(--admin-border)" }}>
        {items.map((it) => {
          const lineRev = Number(it.unitPrice) * it.quantity;
          const delivered = it.deliveredQuantity;
          const isFull = delivered >= it.quantity;
          const isPartial = delivered > 0 && !isFull;
          const busy = pendingId === it.id;
          return (
            <li key={it.id} className={cn("py-3", isFull && "opacity-70")}>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]">
                  {it.snapshot.image ? (
                    <Image src={it.snapshot.image} alt="" fill sizes="48px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
                    {it.snapshot.name}
                    {it.isGift ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-[var(--admin-accent-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--admin-accent)]">
                        Don
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] tabular-nums text-[var(--admin-text-subtle)]">
                    {it.snapshot.brandName ?? "—"} · ×{it.quantity} · {it.volumeMl}&nbsp;ml
                  </p>
                </div>
                <div className="text-right">
                  <Money value={lineRev} bold />
                  <div
                    className={cn(
                      "mt-0.5 text-[11px] font-semibold tabular-nums",
                      isFull
                        ? "text-[var(--admin-success)]"
                        : isPartial
                          ? "text-[var(--admin-warning)]"
                          : "text-[var(--admin-text-subtle)]",
                    )}
                  >
                    {delivered}/{it.quantity} livré
                  </div>
                </div>
              </div>

              {editable ? (
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <div className="flex items-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                    <button
                      type="button"
                      aria-label="Retirer une livraison"
                      disabled={busy || delivered <= 0}
                      onClick={() => setDelivered(it.id, delivered - 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-l-xl text-[var(--admin-text)] tap-scale disabled:opacity-30"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="min-w-[2ch] text-center text-[15px] font-bold tabular-nums text-[var(--admin-text)]">
                      {delivered}
                    </span>
                    <button
                      type="button"
                      aria-label="Ajouter une livraison"
                      disabled={busy || delivered >= it.quantity}
                      onClick={() => setDelivered(it.id, delivered + 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-r-xl text-[var(--admin-text)] tap-scale disabled:opacity-30"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={busy || isFull}
                    onClick={() => setDelivered(it.id, it.quantity)}
                    className={cn(
                      "inline-flex h-11 items-center gap-1 rounded-xl px-3 text-[13px] font-semibold tap-scale",
                      isFull
                        ? "bg-[var(--admin-success-bg,var(--admin-surface-muted))] text-[var(--admin-success)]"
                        : "bg-[var(--admin-accent)] text-white disabled:opacity-40",
                    )}
                  >
                    <Check size={15} /> Tout
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
