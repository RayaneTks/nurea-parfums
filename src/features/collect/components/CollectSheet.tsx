"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Sheet } from "@/ui/primitives/Sheet";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";
import { Money } from "@/ui/patterns/Money";
import { PocketSelector } from "@/features/treasury/components/PocketSelector";
import { usePockets } from "@/features/treasury/usePockets";
import { collectAction } from "@/server/collect/actions";
import type { OutstandingRow } from "@/server/collect/queries";
import { cn } from "@/lib/utils";

type CollectSheetProps = {
  /** Créance à encaisser. `null` ferme la sheet. */
  row: OutstandingRow | null;
  onClose: () => void;
  onCollected?: () => void;
};

/**
 * Encaissement d'une créance en un écran.
 *
 * Le montant est prérempli au reste dû : le cas de loin le plus fréquent est
 * « le client solde tout », et il doit se traiter en deux taps. Les montants
 * partiels restent possibles, avec des raccourcis pour la moitié.
 *
 * La poche est obligatoire dans les faits — c'est ce qui manquait : l'ancien
 * écran corrigeait le reste dû sans jamais dire OÙ l'argent était entré, donc
 * la trésorerie ne bougeait pas.
 */
export function CollectSheet({ row, onClose, onCollected }: CollectSheetProps) {
  const router = useRouter();
  const open = row !== null;
  const { pockets } = usePockets(open);

  const [amount, setAmount] = useState("");
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!row) return;
    setAmount(row.due);
    setError(null);
  }, [row]);

  // Une seule poche configurée : la choisir d'office plutôt que d'imposer un tap.
  useEffect(() => {
    if (pocketId === null && pockets.length === 1) setPocketId(pockets[0]!.id);
  }, [pockets, pocketId]);

  const dueNumber = row ? Number(row.due) : 0;
  const amountNumber = Number(amount.replace(",", ".")) || 0;
  const remaining = Math.max(0, dueNumber - amountNumber);
  const canSubmit = amountNumber > 0 && amountNumber <= dueNumber + 0.005;

  const submit = () => {
    if (!row || !canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await collectAction({
        kind: row.kind,
        id: row.id,
        amount: amount.replace(",", "."),
        pocketId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToast({ type: "success", message: `${amountNumber.toFixed(2)} € encaissés.` });
      onCollected?.();
      onClose();
      router.refresh();
    });
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => (next ? null : onClose())}
        title="Encaisser"
        description={row ? row.customerName : undefined}
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={pending}
            disabled={!canSubmit}
            onClick={submit}
          >
            {amountNumber > 0 ? `Encaisser ${amountNumber.toFixed(2)} €` : "Encaisser"}
          </Button>
        }
      >
        <Stack gap={3}>
          <ErrorBanner message={error} scrollIntoView={false} />

          {row ? (
            <div
              className="rounded-[14px] p-3"
              style={{ background: "var(--admin-surface-muted)" }}
            >
              <HStack justify="between" align="center">
                <span className="text-[13px] text-[var(--admin-text-muted)]">Reste dû</span>
                <Money value={row.due} bold className="text-[20px]" />
              </HStack>
              <p className="mt-1 text-[12px] text-[var(--admin-text-subtle)] tabular-nums">
                {row.kind === "sale" ? "Vente" : "Commande"} · total{" "}
                <Money value={row.total} compact /> · déjà payé{" "}
                <Money value={row.paid} compact />
              </p>
            </div>
          ) : null}

          <Input
            label="Montant encaissé"
            inputMode="decimal"
            numeric
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            enterKeyHint="done"
            error={
              amountNumber > dueNumber + 0.005
                ? `Supérieur au reste dû (${dueNumber.toFixed(2)} €).`
                : undefined
            }
            hint={
              remaining > 0.005 && canSubmit
                ? `Il restera ${remaining.toFixed(2)} € à encaisser.`
                : undefined
            }
          />

          <HStack gap={2}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAmount((dueNumber / 2).toFixed(2))}
              className="flex-1"
            >
              La moitié
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAmount(dueNumber.toFixed(2))}
              className="flex-1"
            >
              Tout solder
            </Button>
          </HStack>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">
              Encaissé dans
            </p>
            {pockets.length > 0 ? (
              <PocketSelector pockets={pockets} value={pocketId} onChange={setPocketId} />
            ) : (
              <p
                className={cn(
                  "flex items-center gap-2 rounded-[12px] p-3 text-[13px]",
                  "text-[var(--admin-text-muted)]",
                )}
                style={{ background: "var(--admin-surface-muted)" }}
              >
                <Wallet size={15} aria-hidden />
                Aucune poche : l&apos;argent ira dans «&nbsp;Non attribué&nbsp;», à répartir
                depuis la Trésorerie.
              </p>
            )}
          </div>
        </Stack>
      </Sheet>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
