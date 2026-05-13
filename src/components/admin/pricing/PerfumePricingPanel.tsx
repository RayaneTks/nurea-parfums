"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { SectionCard } from "../ui/SectionCard";
import { AdminInput } from "../ui/AdminInput";
import { AdminButton } from "../ui/AdminButton";
import { AdminToast, type ToastType } from "../ui/AdminToast";
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
};

function rowKey(v: number): string {
  return `v${v}`;
}

function emptyDraft(): Draft {
  return { unitPriceEur: "", unitCostDzd: "" };
}

export function PerfumePricingPanel({ perfumeId, initial }: PerfumePricingPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const init: Record<string, Draft> = {};
    for (const v of VOLUMES) {
      const found = initial.find((r) => r.volumeMl === v);
      init[rowKey(v)] = {
        unitPriceEur: found?.defaultUnitPriceEur ?? "",
        unitCostDzd: found?.defaultUnitCostDzd ?? "",
      };
    }
    return init;
  });
  const [savingVolume, setSavingVolume] = useState<number | null>(null);
  const [deletingVolume, setDeletingVolume] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  useEffect(() => {
    // Re-sync si la prop change après revalidate.
    const next: Record<string, Draft> = {};
    for (const v of VOLUMES) {
      const found = initial.find((r) => r.volumeMl === v);
      next[rowKey(v)] = {
        unitPriceEur: found?.defaultUnitPriceEur ?? "",
        unitCostDzd: found?.defaultUnitCostDzd ?? "",
      };
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
        updateDraft(v, { unitPriceEur: "", unitCostDzd: "" });
        setToast({ type: "success", message: `Prix ${v}ml supprimé.` });
      });
    },
    [perfumeId],
  );

  return (
    <>
      <SectionCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Prix par défaut</h2>
          <span className="text-xs text-neutral-500">Pré-remplit les commandes.</span>
        </div>
        <div className="space-y-3">
          {VOLUMES.map((v) => {
            const d = drafts[rowKey(v)] ?? emptyDraft();
            const has = initial.some((r) => r.volumeMl === v);
            const dirty =
              (has && initial.find((r) => r.volumeMl === v)?.defaultUnitPriceEur !== d.unitPriceEur) ||
              (has && (initial.find((r) => r.volumeMl === v)?.defaultUnitCostDzd ?? "") !== d.unitCostDzd) ||
              (!has && d.unitPriceEur !== "");

            return (
              <div key={v} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">{v} ml</span>
                  {has ? (
                    <button
                      type="button"
                      onClick={() => remove(v)}
                      disabled={pending && deletingVolume === v}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                      aria-label={`Supprimer prix ${v}ml`}
                    >
                      <Trash2 size={12} /> Retirer
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AdminInput
                    label="Prix € (TTC)"
                    inputMode="decimal"
                    value={d.unitPriceEur}
                    onChange={(e) => updateDraft(v, { unitPriceEur: e.target.value })}
                    placeholder="120"
                  />
                  <AdminInput
                    label="Coût DZD (opt.)"
                    inputMode="decimal"
                    value={d.unitCostDzd}
                    onChange={(e) => updateDraft(v, { unitCostDzd: e.target.value })}
                    placeholder="36000"
                  />
                </div>
                {dirty ? (
                  <div className="mt-2 flex justify-end">
                    <AdminButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => save(v)}
                      isLoading={pending && savingVolume === v}
                    >
                      <Check size={14} /> Enregistrer
                    </AdminButton>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionCard>
      {toast ? (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
