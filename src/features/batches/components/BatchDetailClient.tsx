"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PackageOpen,
  PackageCheck,
  Plus,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { Money } from "@/ui/patterns/Money";
import { BatchExpensesSection } from "./BatchExpensesSection";
import { BatchAssignSheet } from "./BatchAssignSheet";
import type { BatchDetail } from "@/server/batches/queries";

type BatchDetailClientProps = {
  initial: BatchDetail;
};

export function BatchDetailClient({ initial }: BatchDetailClientProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<BatchDetail>(initial);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [assignOpen, setAssignOpen] = useState(false);

  const isOpen = current.status === "OPEN";

  const refresh = async () => {
    try {
      const r = await fetch(`/api/admin/batches/${current.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) return;
      const json = (await r.json()) as { batch?: BatchDetail };
      if (json.batch) setCurrent(json.batch);
    } catch {
      /* noop */
    }
  };

  const patch = (body: Record<string, unknown>, successMsg: string) => {
    startTransition(async () => {
      try {
        const r = await fetch(`/api/admin/batches/${current.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          setToast({ type: "error", message: j.error ?? "Erreur." });
          return;
        }
        const json = (await r.json()) as { batch?: BatchDetail };
        if (json.batch) setCurrent(json.batch);
        setToast({ type: "success", message: successMsg });
        router.refresh();
      } catch {
        setToast({ type: "error", message: "Réseau indisponible." });
      }
    });
  };

  const saveName = async (next: string) => {
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const r = await fetch(`/api/admin/batches/${current.id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: next }),
          });
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { error?: string };
            setToast({ type: "error", message: j.error ?? "Renommage impossible." });
            resolve();
            return;
          }
          setCurrent((b) => ({ ...b, name: next }));
          setToast({ type: "success", message: "Lot renommé." });
          router.refresh();
        } catch {
          setToast({ type: "error", message: "Réseau indisponible." });
        } finally {
          resolve();
        }
      });
    });
  };

  const toggleStatus = () => {
    patch(
      { status: isOpen ? "CLOSED" : "OPEN" },
      isOpen ? "Lot clôturé." : "Lot rouvert.",
    );
  };

  const remove = () => {
    if (current.salesCount > 0) {
      setToast({ type: "error", message: "Détache d'abord les ventes." });
      return;
    }
    const ok = window.confirm(
      `Supprimer définitivement le lot « ${current.name} » ?`,
    );
    if (!ok) return;
    startTransition(async () => {
      try {
        const r = await fetch(`/api/admin/batches/${current.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          setToast({ type: "error", message: j.error ?? "Suppression impossible." });
          return;
        }
        router.push("/admin/lots");
        router.refresh();
      } catch {
        setToast({ type: "error", message: "Réseau indisponible." });
      }
    });
  };

  return (
    <>
      <Stack gap={4}>
        <Link
          href="/admin/lots"
          className="inline-flex items-center gap-1 text-[13px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] tap-scale w-fit"
        >
          <ArrowLeft size={14} /> Lots
        </Link>

        <Card padding={3}>
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                background: isOpen ? "var(--admin-accent-bg)" : "var(--admin-surface-muted)",
                color: isOpen ? "var(--admin-accent)" : "var(--admin-text-muted)",
              }}
              aria-hidden
            >
              {isOpen ? <PackageOpen size={20} /> : <PackageCheck size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <InlineNameEditor
                value={current.name}
                onSave={saveName}
                variant="h2"
                minLength={2}
                maxLength={120}
                ariaLabel="Renommer le lot"
              />
              <p className="mt-1 text-[12px] text-[var(--admin-text-subtle)]">
                {current.salesCount} vente{current.salesCount > 1 ? "s" : ""} ·{" "}
                {isOpen ? "Ouvert" : "Clos"}
                {current.expectedAt
                  ? ` · prévu le ${new Date(current.expectedAt).toLocaleDateString("fr-FR")}`
                  : null}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleStatus}
              disabled={pending}
            >
              {isOpen ? "Clôturer" : "Rouvrir"}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card padding={3} tone="surface">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Encaissé
            </p>
            <p className="mt-1 text-[18px] font-bold leading-none">
              <Money value={current.cashedRevenue} compact />
            </p>
          </Card>
          <Card padding={3} tone="alt">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Marge nette
            </p>
            <p className="mt-1 text-[18px] font-bold leading-none">
              <Money value={current.netMargin} compact tone="success" />
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
              {current.marginPct}%
            </p>
          </Card>
          <Card padding={3} tone="surface">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Dépenses
            </p>
            <p className="mt-1 text-[18px] font-bold leading-none">
              <Money value={current.expenses} compact tone="danger" />
            </p>
          </Card>
          {Number(current.outstandingRevenue) > 0 ? (
            <Card padding={3} tone="surface">
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                Reste à encaisser
              </p>
              <p
                className="mt-1 text-[18px] font-bold leading-none tnum"
                style={{ color: "var(--admin-warning)" }}
              >
                {Number(current.outstandingRevenue).toFixed(0)} €
              </p>
            </Card>
          ) : (
            <Card padding={3} tone="surface">
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                Coût achats
              </p>
              <p className="mt-1 text-[18px] font-bold leading-none">
                <Money value={current.totalCost} compact />
              </p>
            </Card>
          )}
        </div>

        <BatchExpensesSection
          batchId={current.id}
          expenses={current.expensesList}
          total={current.expenses}
          canEdit
          onChange={() => void refresh()}
          onError={(message) => setToast({ type: "error", message })}
        />

        <Card padding={0}>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] px-3 py-2.5">
            <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">
              Ventes ({current.sales.length})
            </h2>
            {isOpen ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leadingIcon={<Plus size={14} />}
                onClick={() => setAssignOpen(true)}
                disabled={pending}
              >
                Assigner
              </Button>
            ) : null}
          </div>
          {current.sales.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-[12px] text-[var(--admin-text-subtle)]">
                Aucune vente rattachée à ce lot.
              </p>
              {isOpen ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leadingIcon={<Plus size={15} />}
                  onClick={() => setAssignOpen(true)}
                  disabled={pending}
                  className="mt-3"
                >
                  Assigner des ventes
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {current.sales.map((s) => {
                const due = Number(s.remainingDue);
                const hasDue = Number.isFinite(due) && due > 0;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/admin/compta?sale=${s.id}`}
                      prefetch={false}
                      className="flex items-center gap-3 px-3 py-3 tap-scale hover:bg-[var(--admin-surface-muted)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[14px] font-medium text-[var(--admin-text)]">
                            {s.customerName}
                          </p>
                          {hasDue ? (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                background: "var(--admin-warning-bg)",
                                color: "var(--admin-warning)",
                              }}
                            >
                              Reste {due.toFixed(0)} €
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-subtle)]">
                          {new Date(s.soldAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          · {s.itemCount} article{s.itemCount > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <Money value={s.cashedRevenue} bold className="text-[14px]" />
                        <p className="mt-0.5 text-[11px]">
                          <Money value={s.netMargin} compact tone="success" />
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-[var(--admin-text-subtle)]"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {current.notes ? (
          <Card padding={3}>
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Notes
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[14px] text-[var(--admin-text)]">
              {current.notes}
            </p>
          </Card>
        ) : null}

        {current.salesCount === 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            leadingIcon={<Trash2 size={15} />}
            onClick={remove}
            disabled={pending}
            className="text-[var(--admin-danger)]"
          >
            Supprimer ce lot
          </Button>
        ) : null}
      </Stack>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}

      <BatchAssignSheet
        batchId={current.id}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onSaved={() => {
          void refresh();
          router.refresh();
          setToast({ type: "success", message: "Lot mis à jour." });
        }}
        onError={(message) => setToast({ type: "error", message })}
      />
    </>
  );
}
