"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, ChevronDown, X } from "lucide-react";
import { Card } from "@/ui/primitives/Card";

type BatchLite = { id: string; name: string };

type BatchPickerProps = {
  /** Endpoint PATCH qui accepte { batchId } (ex. /api/admin/sales/ID ou /api/admin/orders/ID). */
  endpoint: string;
  current: { id: string; name: string } | null;
  onAssigned: (next: { id: string; name: string } | null) => void;
  onError: (message: string) => void;
};

async function fetchOpenBatches(): Promise<BatchLite[]> {
  try {
    const r = await fetch("/api/admin/batches?status=OPEN", {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) return [];
    const json = (await r.json()) as { batches?: BatchLite[] };
    return Array.isArray(json.batches) ? json.batches : [];
  } catch {
    return [];
  }
}

/** Sélecteur de lot réutilisable (ventes + commandes). PATCH { batchId } sur `endpoint`. */
export function BatchPicker({ endpoint, current, onAssigned, onError }: BatchPickerProps) {
  const [open, setOpen] = useState(false);
  const [batches, setBatches] = useState<BatchLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchOpenBatches().then((rows) => {
      setBatches(rows);
      setLoading(false);
    });
  }, [open]);

  const assign = async (batchId: string | null) => {
    setSaving(true);
    try {
      const r = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        onError(j.error ?? "Erreur assignation.");
        return;
      }
      if (batchId === null) onAssigned(null);
      else {
        const found = batches.find((b) => b.id === batchId);
        if (found) onAssigned({ id: found.id, name: found.name });
      }
      setOpen(false);
    } catch {
      onError("Réseau indisponible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding={3} tone="surface">
      <div className="flex items-center gap-2">
        <Boxes size={16} className="shrink-0 text-[var(--admin-text-muted)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Lot
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={saving}
            className="mt-0.5 inline-flex items-center gap-1.5 text-left text-[14px] font-medium text-[var(--admin-text)] tap-scale"
          >
            <span className="truncate">{current ? current.name : "Aucun lot — assigner"}</span>
            <ChevronDown size={14} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
          </button>
        </div>
        {current ? (
          <button
            type="button"
            onClick={() => void assign(null)}
            disabled={saving}
            aria-label="Retirer du lot"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--admin-text-muted)] tap-scale hover:bg-[var(--admin-surface-muted)]"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 max-h-60 overflow-y-auto rounded-[12px] border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          {loading ? (
            <p className="px-3 py-3 text-center text-[12px] text-[var(--admin-text-subtle)]">Chargement…</p>
          ) : batches.length === 0 ? (
            <p className="px-3 py-3 text-center text-[12px] text-[var(--admin-text-subtle)]">
              Aucun lot ouvert.{" "}
              <Link href="/admin/lots/new" className="font-medium text-[var(--admin-accent)] underline">
                Créer un lot
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {batches.map((b) => {
                const active = current?.id === b.id;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => void assign(b.id)}
                      disabled={saving || active}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left tap-scale hover:bg-[var(--admin-surface-muted)] disabled:opacity-60"
                    >
                      <span className="truncate text-[14px] text-[var(--admin-text)]">{b.name}</span>
                      {active ? (
                        <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--admin-accent)]">
                          Actuel
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </Card>
  );
}
