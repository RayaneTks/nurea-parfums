"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ListChecks, Search } from "lucide-react";
import { Sheet } from "@/ui/primitives/Sheet";
import { Button } from "@/ui/primitives/Button";
import { Stack } from "@/ui/primitives/Stack";
import { Input } from "@/ui/primitives/Input";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Money } from "@/ui/patterns/Money";
import { cn } from "@/lib/utils";

type Candidate = {
  id: string;
  customerName: string;
  soldAt: string;
  itemCount: number;
  totalRevenue: string;
  totalMargin: string;
  assigned: boolean;
};

type BatchAssignSheetProps = {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

export function BatchAssignSheet({
  batchId,
  open,
  onOpenChange,
  onSaved,
  onError,
}: BatchAssignSheetProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setQuery("");
    fetch(`/api/admin/batches/${batchId}/candidates`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Chargement impossible.");
        return (await r.json()) as { candidates: Candidate[] };
      })
      .then((data) => {
        const rows = data.candidates ?? [];
        const initial = new Set(rows.filter((c) => c.assigned).map((c) => c.id));
        setCandidates(rows);
        setSelected(new Set(initial));
        setInitialSelected(initial);
      })
      .catch(() => {
        onError("Chargement des ventes impossible.");
        setCandidates([]);
        setSelected(new Set());
        setInitialSelected(new Set());
      })
      .finally(() => setLoading(false));
  }, [open, batchId, onError]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (q.length === 0) return candidates;
    return candidates.filter((c) => c.customerName.toLowerCase().includes(q));
  }, [candidates, q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { attachIds, detachIds, hasChanges } = useMemo(() => {
    const attach: string[] = [];
    const detach: string[] = [];
    for (const c of candidates) {
      const wasIn = initialSelected.has(c.id);
      const isIn = selected.has(c.id);
      if (!wasIn && isIn) attach.push(c.id);
      if (wasIn && !isIn) detach.push(c.id);
    }
    return { attachIds: attach, detachIds: detach, hasChanges: attach.length + detach.length > 0 };
  }, [candidates, initialSelected, selected]);

  const save = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/batches/${batchId}/assign`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attach: attachIds, detach: detachIds }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        onError(j.error ?? "Erreur lors de l'assignation.");
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch {
      onError("Réseau indisponible.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selected.size;
  const totalAvailable = candidates.length;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Assigner des ventes"
      description={
        totalAvailable > 0
          ? `${selectedCount} sélectionnée${selectedCount > 1 ? "s" : ""} / ${totalAvailable}`
          : undefined
      }
      maxVh={92}
      footer={
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          leadingIcon={<Check size={16} />}
          onClick={save}
          disabled={!hasChanges || saving}
        >
          {saving
            ? "Enregistrement…"
            : hasChanges
              ? `Enregistrer (${attachIds.length + detachIds.length} changement${attachIds.length + detachIds.length > 1 ? "s" : ""})`
              : "Aucun changement"}
        </Button>
      }
    >
      <Stack gap={3}>
        {totalAvailable > 0 ? (
          <Input
            type="search"
            inputMode="search"
            placeholder="Rechercher un client…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leadingIcon={<Search size={16} />}
            variant="elevated"
          />
        ) : null}

        {loading ? (
          <Stack gap={2}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={56} />
            ))}
          </Stack>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={q.length > 0 ? "Aucun résultat" : "Aucune vente disponible"}
            description={
              q.length > 0
                ? "Essaie un autre nom de client."
                : "Toutes les ventes sont déjà rattachées à un autre lot."
            }
          />
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((c) => {
              const checked = selected.has(c.id);
              const date = new Date(c.soldAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-pressed={checked}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left tap-scale",
                      checked
                        ? "bg-[var(--admin-accent-bg)]"
                        : "bg-[var(--admin-surface-alt)] hover:bg-[var(--admin-surface-muted)]",
                    )}
                    style={{
                      border: `1px solid ${checked ? "var(--admin-accent)" : "var(--admin-border)"}`,
                    }}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] transition-colors",
                        checked
                          ? "bg-[var(--admin-accent)] text-white"
                          : "border border-[var(--admin-border-strong)] bg-[var(--admin-surface)]",
                      )}
                    >
                      {checked ? <Check size={14} strokeWidth={3} /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium leading-tight text-[var(--admin-text)]">
                        {c.customerName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--admin-text-subtle)] tabular-nums">
                        {date} · {c.itemCount} article{c.itemCount > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <Money value={c.totalRevenue} bold className="text-[13px]" />
                      <p className="mt-0.5 text-[11px]">
                        <Money value={c.totalMargin} compact tone="success" />
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Stack>
    </Sheet>
  );
}
