"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { pocketIcon, type PocketOption } from "./PocketSelector";

export type SplitRow = { pocketId: string; amount: number };

type PocketSplitProps = {
  pockets: PocketOption[];
  /** Montant total encaissé à répartir. */
  total: number;
  onChange: (rows: SplitRow[]) => void;
};

/**
 * Répartition de l'encaissé entre plusieurs poches (ex. 20€ espèces + 30€ Revolut).
 * Tape une poche pour l'ajouter (pré-remplie avec le reste) ; ajuste les montants.
 * Le reste non attribué tombera dans « Non attribué » côté serveur.
 */
export function PocketSplit({ pockets, total, onChange }: PocketSplitProps) {
  const [rows, setRows] = useState<{ pocketId: string; amount: string }[]>([]);

  const attributed = rows.reduce((s, r) => s + (Number(r.amount.replace(",", ".")) || 0), 0);
  const remaining = Math.max(0, Math.round((total - attributed) * 100) / 100);

  useEffect(() => {
    onChange(
      rows
        .map((r) => ({ pocketId: r.pocketId, amount: Number(r.amount.replace(",", ".")) || 0 }))
        .filter((r) => r.amount > 0),
    );
  }, [rows, onChange]);

  const available = useMemo(() => {
    const used = new Set(rows.map((r) => r.pocketId));
    return pockets.filter((p) => !used.has(p.id));
  }, [pockets, rows]);

  const addPocket = (id: string) => {
    setRows((prev) => [...prev, { pocketId: id, amount: remaining > 0 ? remaining.toFixed(2) : "" }]);
  };
  const setAmount = (id: string, amount: string) =>
    setRows((prev) => prev.map((r) => (r.pocketId === id ? { ...r, amount } : r)));
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.pocketId !== id));

  const nameOf = (id: string) => pockets.find((p) => p.id === id)?.name ?? "Poche";
  const kindOf = (id: string) => pockets.find((p) => p.id === id)?.kind ?? "OTHER";

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const Icon = pocketIcon(kindOf(r.pocketId));
        return (
          <div key={r.pocketId} className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--admin-surface-muted)] text-[var(--admin-accent)]">
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--admin-text)]">
              {nameOf(r.pocketId)}
            </span>
            <input
              inputMode="decimal"
              value={r.amount}
              onChange={(e) => setAmount(r.pocketId, e.target.value)}
              placeholder="0"
              className="h-11 w-24 rounded-[10px] border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-right text-[15px] tabular-nums outline-none focus:border-[var(--admin-accent)]"
            />
            <span className="text-[13px] text-[var(--admin-text-subtle)]">€</span>
            <button
              type="button"
              onClick={() => remove(r.pocketId)}
              aria-label={`Retirer ${nameOf(r.pocketId)}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--admin-text-subtle)] tap-scale"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {available.map((p) => {
            const Icon = pocketIcon(p.kind);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addPocket(p.id)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-[14px] font-medium text-[var(--admin-text)] tap-scale"
              >
                <Plus size={14} /> <Icon size={15} /> {p.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <p
        className={cn(
          "pt-1 text-[12px] tabular-nums",
          remaining < 0.005 && rows.length > 0
            ? "text-[var(--admin-success)]"
            : "text-[var(--admin-text-subtle)]",
        )}
      >
        {rows.length === 0
          ? "Aucune poche : l'encaissé ira dans « Non attribué »."
          : remaining < 0.005
            ? "Réparti intégralement ✓"
            : `Reste ${remaining.toFixed(2)} € → « Non attribué »`}
      </p>
    </div>
  );
}
