"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import type { PocketSummary } from "@/contracts/treasury";
import { updatePocketAction } from "@/server/treasury/actions";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { movedOrder, ownPockets } from "./treasury-model";

/**
 * S21 — Ordre des poches (06 S21) : « Monter » / « Descendre » de 44 px (pas de glisser-déposer, 05 §4.2),
 * enregistrement immédiat (`updatePocketAction({ id, position })`, le serveur renumérote) ; ordre affiché
 * aussitôt, restauré si le serveur refuse (toast de `useAction`). « Non attribué » reste en dernier, hors liste.
 */
export function PocketOrderSheet({ open, onClose, pockets }: { open: boolean; onClose: () => void; pockets: readonly PocketSummary[] }) {
  useShellSheet(open, onClose);
  const serverOrder = ownPockets(pockets);
  const serverKey = serverOrder.map((pocket) => pocket.id).join("|");
  const [order, setOrder] = useState(serverOrder);
  // La vérité revient du serveur : un nouvel ordre reçu remplace l'ordre affiché.
  useEffect(() => {
    setOrder(serverOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);
  const update = useAction(updatePocketAction);

  const move = async (index: number, delta: -1 | 1) => {
    const previous = order;
    const next = movedOrder(order, index, delta);
    const moved = next[index + delta];
    if (!moved || next === previous) return;
    setOrder(next);
    const result = await update.run({ id: moved.id, position: index + delta });
    if (!result.ok) setOrder(previous);
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())} title="Ordre des poches" size="auto">
      <div className="flex flex-col gap-3" data-pocket-order-sheet>
        <Text variant="caption" tone="muted">
          Cet ordre est celui des poches proposées à l&apos;encaissement. « Non attribué » reste en dernier.
        </Text>
        <Card padding={0}>
          {order.map((pocket, index) => (
            <div key={pocket.id}>
              {index > 0 ? <Divider /> : null}
              <div className="flex min-h-[56px] items-center gap-2 py-1 pl-4 pr-1" data-pocket-order={pocket.name}>
                <span className="min-w-0 flex-1">
                  <span className="admin-type-body block truncate font-medium text-[var(--admin-text)]">{pocket.name}</span>
                  <Money value={pocket.balance} tone="muted" className="admin-type-caption" />
                </span>
                <Button variant="ghost" iconOnly ariaLabel={`Monter ${pocket.name}`} disabled={index === 0 || update.pending} onClick={() => void move(index, -1)}>
                  <ChevronUp size={20} />
                </Button>
                <Button
                  variant="ghost"
                  iconOnly
                  ariaLabel={`Descendre ${pocket.name}`}
                  disabled={index === order.length - 1 || update.pending}
                  onClick={() => void move(index, 1)}
                >
                  <ChevronDown size={20} />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </Sheet>
  );
}
