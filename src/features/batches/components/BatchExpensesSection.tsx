"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Receipt } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Money } from "@/ui/patterns/Money";
import { PocketSelector } from "@/features/treasury/components/PocketSelector";
import { usePockets } from "@/features/treasury/usePockets";
import type { BatchExpenseRow } from "@/server/batches/queries";

type BatchExpensesSectionProps = {
  batchId: string;
  expenses: BatchExpenseRow[];
  total: string;
  canEdit: boolean;
  onChange: () => void;
  onError: (message: string) => void;
};

function parseAmount(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function BatchExpensesSection({
  batchId,
  expenses,
  total,
  canEdit,
  onChange,
  onError,
}: BatchExpensesSectionProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [countInCompta, setCountInCompta] = useState(true);
  const [pending, startTransition] = useTransition();
  const { pockets } = usePockets(adding);

  const submit = () => {
    const lbl = label.trim();
    if (lbl.length < 2) {
      onError("Libellé requis (min 2 caractères).");
      return;
    }
    const amt = parseAmount(amount);
    if (amt === null) {
      onError("Montant invalide (> 0).");
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch(`/api/admin/batches/${batchId}/expenses`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            label: lbl,
            amount: amt.toFixed(2),
            pocketId: countInCompta ? pocketId : null,
            countInCompta,
          }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          onError(j.error ?? "Ajout impossible.");
          return;
        }
        setLabel("");
        setAmount("");
        setPocketId(null);
        setCountInCompta(true);
        setAdding(false);
        onChange();
        router.refresh();
      } catch {
        onError("Réseau indisponible.");
      }
    });
  };

  const toggleCounted = (expenseId: string, next: boolean) => {
    startTransition(async () => {
      try {
        const r = await fetch(`/api/admin/batches/${batchId}/expenses/${expenseId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ countInCompta: next }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          onError(j.error ?? "Modification impossible.");
          return;
        }
        onChange();
        router.refresh();
      } catch {
        onError("Réseau indisponible.");
      }
    });
  };

  const remove = (expenseId: string) => {
    startTransition(async () => {
      try {
        const r = await fetch(
          `/api/admin/batches/${batchId}/expenses/${expenseId}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        );
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          onError(j.error ?? "Suppression impossible.");
          return;
        }
        onChange();
        router.refresh();
      } catch {
        onError("Réseau indisponible.");
      }
    });
  };

  return (
    <Card padding={3}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">
            Dépenses
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--admin-text-subtle)]">
            Transport, billet, frais — réduisent la marge nette.
          </p>
        </div>
        {canEdit && !adding ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setAdding(true)}
          >
            Ajouter
          </Button>
        ) : null}
      </div>

      {expenses.length === 0 && !adding ? (
        <EmptyState
          icon={Receipt}
          title="Aucune dépense"
          description="Ajoute transport, billet ou frais pour calculer la marge nette."
          className="py-5"
          action={
            canEdit ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leadingIcon={<Plus size={14} />}
                onClick={() => setAdding(true)}
              >
                Ajouter une dépense
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Stack gap={2}>
          {expenses.map((e) => {
            const counted = e.countInCompta;
            return (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-[12px] bg-[var(--admin-surface-muted)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-[var(--admin-text)]">
                  <span className="truncate">{e.label}</span>
                  {!counted ? (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ background: "var(--admin-surface)", color: "var(--admin-text-muted)" }}
                    >
                      Hors compta
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-[var(--admin-text-subtle)]">
                  {new Date(e.occurredAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {canEdit ? (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => toggleCounted(e.id, !counted)}
                        disabled={pending}
                        className="font-medium text-[var(--admin-accent)] tap-scale disabled:opacity-50"
                      >
                        {counted ? "Exclure de la compta" : "Compter dans la compta"}
                      </button>
                    </>
                  ) : null}
                </p>
              </div>
              <Money
                value={e.amount}
                bold
                className="text-[14px]"
                tone={counted ? "default" : "muted"}
              />
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  disabled={pending}
                  aria-label={`Supprimer ${e.label}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--admin-danger)] tap-scale hover:bg-[var(--admin-danger-bg)] disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
            );
          })}
          {expenses.length > 0 ? (
            <div className="mt-1 flex items-center justify-between border-t border-[var(--admin-border)] pt-2 text-[13px]">
              <span className="font-medium text-[var(--admin-text-muted)]">
                Total dépenses
              </span>
              <Money value={total} bold />
            </div>
          ) : null}
        </Stack>
      )}

      {canEdit && adding ? (
        <div className="mt-3 space-y-2 rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3">
          <Input
            label="Libellé"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex. Billet d'avion"
            autoFocus
            enterKeyHint="next"
          />
          <Input
            label="Montant (€)"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            numeric
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            enterKeyHint="done"
          />
          <label className="flex items-start gap-2.5 rounded-[10px] bg-[var(--admin-surface-muted)] p-2.5">
            <input
              type="checkbox"
              checked={!countInCompta}
              onChange={(e) => setCountInCompta(!e.target.checked)}
              className="mt-0.5 h-4 w-4"
              style={{ accentColor: "var(--admin-accent)" }}
            />
            <span>
              <span className="block text-[13px] font-medium text-[var(--admin-text)]">
                Hors compta (argent perso)
              </span>
              <span className="block text-[11px] text-[var(--admin-text-subtle)]">
                Juste une note : ni déduite de la marge, ni sortie de trésorerie.
              </span>
            </span>
          </label>
          {countInCompta && pockets.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">
                Payé depuis (poche)
              </p>
              <PocketSelector pockets={pockets} value={pocketId} onChange={setPocketId} />
              <p className="mt-1 text-[11px] text-[var(--admin-text-subtle)]">
                Sans choix → « Non attribué », à répartir plus tard.
              </p>
            </div>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => {
                setAdding(false);
                setLabel("");
                setAmount("");
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              fullWidth
              isLoading={pending}
              onClick={submit}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
