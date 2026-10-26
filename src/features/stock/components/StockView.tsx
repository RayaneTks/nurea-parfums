"use client";

import { PackageOpen } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "@/app-shell/FeedbackProvider";
import { routes, withSheet } from "@/app-shell/routes";
import { useShellNavigation } from "@/app-shell/ShellNavigation";
import { useUndo } from "@/app-shell/UndoProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import type { StockBottleDTO } from "@/contracts/stock";
import { removeStockBottleAction } from "@/server/stock/actions";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { bottleDetail, bottleName, bottleOrigin, bottleShortOrigin, stockCount } from "./stock-model";

/**
 * E23 — les flacons déjà achetés d'une commande désistée. Toucher un flacon ouvre sa feuille : d'où il vient,
 * son prix prévu, « Retirer du stock » (filet « Annuler » de 5 s). La revente depuis Vendre arrive en phase 3.
 */
export function StockView({ bottles }: { bottles: StockBottleDTO[] }) {
  const confirm = useConfirm();
  const { scheduleDelete } = useUndo();
  const remove = useAction(removeStockBottleAction, { errors: "inline" });
  const { navigate } = useShellNavigation();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = bottles.filter((bottle) => !hidden.has(bottle.id));
  const open = shown.find((bottle) => bottle.id === openId) ?? null;

  const removeBottle = async (bottle: StockBottleDTO) => {
    setOpenId(null);
    const ok = await confirm({
      title: `Retirer ${bottleName(bottle)} du stock ?`,
      description: "Il ne sera plus proposé à la vente. Tu pourras annuler pendant 5 secondes.",
      confirmLabel: "Retirer du stock",
      tone: "danger",
    });
    if (!ok) return;
    setHidden((current) => new Set(current).add(bottle.id));
    scheduleDelete({
      message: `${bottleName(bottle)} retiré du stock`,
      errorMessage: "Le flacon n'a pas pu être retiré. Réessaie.",
      onUndo: () =>
        setHidden((current) => {
          const next = new Set(current);
          next.delete(bottle.id);
          return next;
        }),
      onCommit: async () => {
        const result = await remove.run({ id: bottle.id });
        if (!result.ok) throw new Error(result.error.message);
      },
    });
  };

  if (shown.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Aucun flacon en stock"
        description="Quand un client se désiste d'une commande confirmée, son flacon arrive ici, prêt à être revendu."
        action={
          <Button variant="secondary" onClick={() => navigate(routes.commandes())}>
            Voir les commandes
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Text variant="caption" tone="muted">
        {stockCount(shown.length)}
      </Text>
      <Card padding={0}>
        {shown.map((bottle) => (
          <ListRow
            key={bottle.id}
            primary={bottleName(bottle)}
            secondary={bottleShortOrigin(bottle)}
            trailing={<Money value={bottle.plannedPriceEur} bold />}
            onClick={() => setOpenId(bottle.id)}
            chevron
          />
        ))}
      </Card>

      <Sheet
        open={open !== null}
        onOpenChange={(next) => (next ? undefined : setOpenId(null))}
        size="auto"
        title={open ? bottleName(open) : "Flacon"}
        description={open ? bottleOrigin(open) : undefined}
      >
        {open ? (
          <div className="flex flex-col gap-4">
            <Text variant="body">{bottleDetail(open)}</Text>
            <Text variant="caption" tone="muted">
              {"Pour le revendre, crée une vente dans Vendre, puis retire-le d'ici."}
            </Text>
            <div className="flex flex-col gap-2">
              {open.sourceDocumentId ? (
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    const doc = open.sourceDocumentId;
                    setOpenId(null);
                    if (doc) navigate(withSheet(routes.stock(), { doc }));
                  }}
                >
                  {"Voir la commande d'origine"}
                </Button>
              ) : null}
              <Button variant="secondary" size="lg" fullWidth onClick={() => void removeBottle(open)}>
                Retirer du stock
              </Button>
              <Text variant="caption" tone="muted" className="text-center">
                Cassé, gardé pour toi ou offert ? Retire-le du stock.
              </Text>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
