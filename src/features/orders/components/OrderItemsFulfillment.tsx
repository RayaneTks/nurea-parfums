"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Sheet } from "@/ui/primitives/Sheet";
import { Stack } from "@/ui/primitives/Stack";
import { Money } from "@/ui/patterns/Money";
import { PocketSelector } from "@/features/treasury/components/PocketSelector";
import { usePockets } from "@/features/treasury/usePockets";
import { cn } from "@/lib/utils";
import { deriveFulfillment, type Fulfillment } from "@/domain/order-status";
import type { OrderDetailRow } from "@/server/orders/queries";

type Item = OrderDetailRow["items"][number];

type OrderItemsFulfillmentProps = {
  orderId: string;
  items: Item[];
  /** Si false, affichage seul (vente liée, commande figée). */
  editable: boolean;
  /** Reste dû actuel (€) — plafonne l'encaissement automatique à la livraison. */
  orderDue: number;
  onFulfillmentChange?: (next: Fulfillment, items: Item[]) => void;
  /** Argent encaissé automatiquement à la livraison (pour rafraîchir le solde parent). */
  onCollected?: (amount: number) => void;
  onError?: (message: string) => void;
};

/** Attente d'un choix de poche avant d'encaisser la livraison d'un flacon. */
type PendingCollect = {
  itemId: string;
  targetQuantity: number;
  previous: Item[];
  next: Item[];
  amount: number;
  label: string;
};

/**
 * Liste des articles avec suivi de livraison par ligne (livraison partielle).
 *
 * - Stepper −/+ (hitbox 44px) + bouton « Tout » pour livrer la ligne entière.
 * - Livrer un flacon = récupérer son argent : toute hausse encaisse la valeur livrée
 *   (plafonnée au reste dû) en « Solde », dans une poche choisie à chaque fois.
 * - Optimistic update, PATCH /api/admin/orders/[id]/fulfillment, rollback sur erreur.
 */
export function OrderItemsFulfillment({
  orderId,
  items: initialItems,
  editable,
  orderDue,
  onFulfillmentChange,
  onCollected,
  onError,
}: OrderItemsFulfillmentProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [due, setDue] = useState(orderDue);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [collect, setCollect] = useState<PendingCollect | null>(null);
  const [pocketId, setPocketId] = useState<string | null>(null);
  const { pockets } = usePockets(collect !== null);
  const [, startTransition] = useTransition();

  if (items.length === 0) return null;

  const persist = (
    next: Item[],
    itemId: string,
    previous: Item[],
    payPocketId?: string | null,
  ) => {
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
            ...(payPocketId !== undefined ? { pocketId: payPocketId } : {}),
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          setItems(previous);
          onFulfillmentChange?.(deriveFulfillment(previous), previous);
          onError?.(err.error ?? "Livraison non enregistrée.");
          return;
        }
        const json = (await res.json().catch(() => ({}))) as { collected?: number };
        const collected = Number(json.collected ?? 0);
        if (collected > 0.005) {
          setDue((d) => Math.max(0, d - collected));
          onCollected?.(collected);
          // Rafraîchit le panneau Solde (nouveau paiement) et la trésorerie.
          router.refresh();
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
    const line = items.find((it) => it.id === itemId);
    if (!line) return;
    const clamped = Math.max(0, Math.min(value, line.quantity));
    if (clamped === line.deliveredQuantity) return;
    const next = items.map((it) =>
      it.id === itemId ? { ...it, deliveredQuantity: clamped } : it,
    );

    const delta = clamped - line.deliveredQuantity;
    // Hausse d'une ligne payante avec du reste dû → on demande la poche d'encaissement.
    const collectable = Math.min(
      delta > 0 && !line.isGift ? Number(line.unitPrice) * delta : 0,
      Math.max(0, due),
    );
    if (collectable > 0.005) {
      setPocketId(null);
      setCollect({
        itemId,
        targetQuantity: clamped,
        previous,
        next,
        amount: collectable,
        label: line.snapshot.name,
      });
      return;
    }
    persist(next, itemId, previous);
  };

  const confirmCollect = () => {
    if (!collect) return;
    const c = collect;
    setCollect(null);
    persist(c.next, c.itemId, c.previous, pocketId);
  };

  return (
    <>
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

      {/* Encaissement du flacon livré : d'où entre l'argent (livrer = récupérer les sous). */}
      <Sheet
        open={collect !== null}
        onOpenChange={(o) => (o ? null : setCollect(null))}
        title="Flacon livré — encaissé"
        description={collect ? `${collect.label} · reçu ${collect.amount.toFixed(2)} €.` : undefined}
        footer={
          <Button variant="primary" size="lg" fullWidth onClick={confirmCollect}>
            C&apos;est reçu — livrer
          </Button>
        }
      >
        <Stack gap={3}>
          <div className="rounded-[14px] p-3" style={{ background: "var(--admin-surface-alt)" }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Encaissé à la livraison (entre en trésorerie)
            </p>
            <p className="mt-1 text-[24px] font-bold leading-none">
              <Money value={collect?.amount ?? 0} />
            </p>
          </div>
          {pockets.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">
                Reçu dans (poche)
              </p>
              <PocketSelector pockets={pockets} value={pocketId} onChange={setPocketId} />
              <p className="mt-1 text-[11px] text-[var(--admin-text-subtle)]">
                Sans choix → « Non attribué », à répartir plus tard.
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--admin-text-subtle)]">
              Crée une poche (Espèces, Revolut…) dans Trésorerie pour tracer où entre l&apos;argent.
              Sans poche, l&apos;encaissé ira dans « Non attribué ».
            </p>
          )}
        </Stack>
      </Sheet>
    </>
  );
}
