"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import {
  deletePerfumePricingAction,
  upsertPerfumePricingAction,
} from "@/server/pricing/actions";
import type { PerfumePricingRow } from "@/server/pricing/queries";

type PerfumePricingPanelProps = {
  perfumeId: number;
  initial: PerfumePricingRow[];
};

const VOLUMES = [30, 50, 100] as const;

type Draft = {
  unitPriceEur: string;
  unitCostDzd: string;
  exchangeRate: string;
};

function rowKey(v: number): string {
  return `v${v}`;
}

function emptyDraft(): Draft {
  return { unitPriceEur: "", unitCostDzd: "", exchangeRate: "" };
}

function draftFromRow(row: PerfumePricingRow | undefined): Draft {
  return {
    unitPriceEur: row?.defaultUnitPriceEur ?? "",
    unitCostDzd: row?.defaultUnitCostDzd ?? "",
    exchangeRate: row?.defaultExchangeRate ?? "",
  };
}

export function PerfumePricingPanel({ perfumeId, initial }: PerfumePricingPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const init: Record<string, Draft> = {};
    for (const v of VOLUMES) {
      init[rowKey(v)] = draftFromRow(initial.find((r) => r.volumeMl === v));
    }
    return init;
  });
  const [savingVolume, setSavingVolume] = useState<number | null>(null);
  const [deletingVolume, setDeletingVolume] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const v of VOLUMES) {
      next[rowKey(v)] = draftFromRow(initial.find((r) => r.volumeMl === v));
    }
    setDrafts(next);
  }, [initial]);

  const updateDraft = (v: number, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const key = rowKey(v);
      return { ...prev, [key]: { ...(prev[key] ?? emptyDraft()), ...patch } };
    });
  };

  const save = useCallback(
    (v: number) => {
      const d = drafts[rowKey(v)] ?? emptyDraft();
      if (d.unitPriceEur.trim() === "") {
        setToast({ type: "error", message: "Prix obligatoire." });
        return;
      }
      setSavingVolume(v);
      startTransition(async () => {
        const result = await upsertPerfumePricingAction({
          perfumeId,
          volumeMl: v,
          defaultUnitPriceEur: d.unitPriceEur,
          defaultUnitCostDzd: d.unitCostDzd === "" ? null : d.unitCostDzd,
          defaultExchangeRate: d.exchangeRate === "" ? null : d.exchangeRate,
        });
        setSavingVolume(null);
        if (!result.ok) {
          setToast({ type: "error", message: result.error });
          return;
        }
        setToast({ type: "success", message: `Prix ${v}ml enregistré.` });
      });
    },
    [drafts, perfumeId],
  );

  const remove = useCallback(
    (v: number) => {
      setDeletingVolume(v);
      startTransition(async () => {
        const result = await deletePerfumePricingAction(perfumeId, v);
        setDeletingVolume(null);
        if (!result.ok) {
          setToast({ type: "error", message: result.error });
          return;
        }
        updateDraft(v, { unitPriceEur: "", unitCostDzd: "", exchangeRate: "" });
        setToast({ type: "success", message: `Prix ${v}ml supprimé.` });
      });
    },
    [perfumeId],
  );

  return (
    <>
      <Card padding={3}>
        <HStack justify="between" align="center" className="mb-3">
          <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">
            Prix par défaut
          </h2>
          <span className="text-[12px] text-[var(--admin-text-subtle)]">
            Pré-remplit les commandes.
          </span>
        </HStack>

        <Stack gap={3}>
          {VOLUMES.map((v) => {
            const d = drafts[rowKey(v)] ?? emptyDraft();
            const existing = initial.find((r) => r.volumeMl === v);
            const has = existing !== undefined;
            const dirty =
              (has &&
                (existing.defaultUnitPriceEur !== d.unitPriceEur ||
                  (existing.defaultUnitCostDzd ?? "") !== d.unitCostDzd ||
                  (existing.defaultExchangeRate ?? "") !== d.exchangeRate)) ||
              (!has && d.unitPriceEur !== "");

            return (
              <div
                key={v}
                className="rounded-[14px] p-3"
                style={{
                  background: "var(--admin-surface-alt)",
                  border: "1px solid var(--admin-border)",
                }}
              >
                <HStack justify="between" align="center" className="mb-2">
                  <span className="text-[14px] font-semibold text-[var(--admin-text)]">
                    {v} ml
                  </span>
                  {has ? (
                    <button
                      type="button"
                      onClick={() => remove(v)}
                      disabled={pending && deletingVolume === v}
                      className="inline-flex items-center gap-1 text-[12px] text-[var(--admin-danger)] tap-scale hover:underline disabled:opacity-50"
                      aria-label={`Supprimer prix ${v}ml`}
                    >
                      <Trash2 size={12} /> Retirer
                    </button>
                  ) : null}
                </HStack>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Prix €"
                    inputMode="decimal"
                    numeric
                    value={d.unitPriceEur}
                    onChange={(e) => updateDraft(v, { unitPriceEur: e.target.value })}
                    placeholder="ex. 120"
                    enterKeyHint="next"
                  />
                  <Input
                    label="Coût DZD"
                    inputMode="decimal"
                    numeric
                    value={d.unitCostDzd}
                    onChange={(e) => updateDraft(v, { unitCostDzd: e.target.value })}
                    placeholder="ex. 36000"
                    enterKeyHint="next"
                  />
                  <Input
                    label="Taux"
                    inputMode="decimal"
                    numeric
                    value={d.exchangeRate}
                    onChange={(e) => updateDraft(v, { exchangeRate: e.target.value })}
                    placeholder="ex. 277"
                    enterKeyHint="done"
                  />
                </div>

                {dirty ? (
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => save(v)}
                      isLoading={pending && savingVolume === v}
                      leadingIcon={<Check size={14} />}
                    >
                      Enregistrer
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </Stack>
      </Card>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
