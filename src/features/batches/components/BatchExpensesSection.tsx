"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Receipt } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { Money } from "@/ui/patterns/Money";
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
  const [pending, startTransition] = useTransition();

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
          body: JSON.stringify({ label: lbl, amount: amt.toFixed(2) }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          onError(j.error ?? "Ajout impossible.");
          return;
        }
        setLabel("");
        setAmount("");
        setAdding(false);
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
        <div className="flex flex-col items-center gap-2 rounded-[12px] bg-[var(--admin-surface-muted)] px-4 py-6 text-center">
          <Receipt size={20} className="text-[var(--admin-text-subtle)]" />
          <p className="text-[12px] text-[var(--admin-text-subtle)]">
            Aucune dépense pour ce lot.
          </p>
        </div>
      ) : (
        <Stack gap={2}>
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-[12px] bg-[var(--admin-surface-muted)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[var(--admin-text)]">
                  {e.label}
                </p>
                <p className="text-[11px] text-[var(--admin-text-subtle)]">
                  {new Date(e.occurredAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Money value={e.amount} bold className="text-[14px]" />
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
          ))}
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
          />
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
