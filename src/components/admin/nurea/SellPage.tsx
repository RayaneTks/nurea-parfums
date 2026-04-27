"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ReceiptText,
} from "lucide-react";
import { HeaderAction } from "../shell/HeaderAction";
import { SectionCard } from "../ui/SectionCard";
import { AdminButton } from "../ui/AdminButton";
import { AdminInput } from "../ui/AdminInput";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { StatCard } from "../ui/StatCard";
import { cn, formatMoney } from "@/lib/utils";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { ORDER_VOLUMES_ML } from "@/lib/gestion/orderLineValidation";
import type {
  OrderRow,
  PerfumePickerRow,
} from "@/lib/gestion/types";

type Line = {
  key: string;
  perfume: PerfumePickerRow;
  quantity: number;
  unitPrice: string;
  unitCost: string;
  volumeMl: (typeof ORDER_VOLUMES_ML)[number];
};

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function toNum(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function lineRevenue(l: Line) {
  return toNum(l.unitPrice) * l.quantity;
}
function lineCost(l: Line) {
  return toNum(l.unitCost) * l.quantity;
}
function lineMargin(l: Line) {
  return lineRevenue(l) - lineCost(l);
}

const PerfumePicker = dynamic(
  () => import("../gestion/PerfumePicker").then((mod) => mod.PerfumePicker),
  { ssr: false },
);

export function NureaSellPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOrder = searchParams.get("fromOrder");

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [orderLoading, setOrderLoading] = useState(!!fromOrder);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; text: string } | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const fetchOrder = useCallback(async (orderId: string) => {
    setOrderLoading(true);
    setOrderError(null);
    try {
      const r = await fetch(`/api/admin/orders/${orderId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Impossible de charger la commande.");
      }
      const j = await readJsonSafe<{ order: OrderRow }>(r);
      if (!j?.order) throw new Error("Commande introuvable.");
      if (j.order.sale) {
        throw new Error("Cette commande a déjà une vente associée.");
      }
      setOrder(j.order);
      setCustomerName(j.order.customerName ?? "");
      setLines(
        j.order.items
          .filter((item) => item.perfume)
          .map((item) => ({
            key: `${item.id}`,
            perfume: {
              id: item.perfume!.id,
              name: item.perfume!.name,
              image: item.perfume!.image,
              status: "PUBLISHED",
              brand: item.perfume!.brand,
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? "",
            unitCost: item.unitCost ?? "",
            volumeMl: (ORDER_VOLUMES_ML as readonly number[]).includes(item.volumeMl)
              ? (item.volumeMl as Line["volumeMl"])
              : 100,
          })),
      );
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setOrderLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fromOrder) {
      fetchOrder(fromOrder);
    }
  }, [fromOrder, fetchOrder]);

  const totals = useMemo(() => {
    const revenue = lines.reduce((acc, l) => acc + lineRevenue(l), 0);
    const cost = lines.reduce((acc, l) => acc + lineCost(l), 0);
    const margin = revenue - cost;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, cost, margin, marginPercent };
  }, [lines]);

  const isBridge = !!order;
  const canSubmit =
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.quantity >= 1 &&
        toNum(l.unitPrice) >= 0 &&
        toNum(l.unitCost) >= 0,
    ) &&
    !saving;

  const addPerfume = (p: PerfumePickerRow) => {
    if (isBridge) return;
    setLines((prev) => [
      ...prev,
      {
        key: `${p.id}-${Date.now()}`,
        perfume: p,
        quantity: 1,
        unitPrice: "",
        unitCost: "",
        volumeMl: 100,
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    if (isBridge) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        orderId: order?.id ?? null,
        customerName: customerName.trim() || null,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          perfumeId: l.perfume.id,
          quantity: l.quantity,
          unitPrice: toNum(l.unitPrice),
          unitCost: toNum(l.unitCost),
          volumeMl: l.volumeMl,
        })),
      };
      const r = await fetch("/api/admin/sales", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Enregistrement impossible.");
      }
      router.push("/admin/compta");
      router.refresh();
    } catch (err) {
      setToast({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur",
      });
      setSaving(false);
    }
  };

  if (orderLoading) {
    return (
      <>
        <div className="flex items-center gap-2 px-5 pt-3">
          <HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />
          <h1 className="text-lg font-bold text-admin-text">Vendre</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-admin-accent" aria-hidden />
        </div>
      </>
    );
  }

  if (orderError) {
    return (
      <>
        <div className="flex items-center gap-2 px-5 pt-3">
          <HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />
          <h1 className="text-lg font-bold text-admin-text">Vendre</h1>
        </div>
        <main id="main-content" className="flex-1 px-5 pt-5">
          <SectionCard className="p-4 border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]">
            <p className="text-[13px] text-admin-danger">{orderError}</p>
            <Link
              href="/admin/ordres"
              prefetch
              className="mt-2 inline-block text-[11px] uppercase tracking-wider text-admin-accent font-medium"
            >
              Retour aux commandes
            </Link>
          </SectionCard>
        </main>
      </>
    );
  }

  return (
    <>
      <main id="main-content" className="flex-1 space-y-6 px-5 pb-40 pt-2">
        {isBridge ? (
          <div className="flex items-center gap-2">
            <HeaderAction
              label="Retour à la commande"
              icon={ArrowLeft}
              onClick={() => router.push(`/admin/ordres/${order!.id}`)}
            />
          </div>
        ) : null}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-admin-text">
            {isBridge ? "Encaisser" : "Vendre"}
          </h1>
          <p className="mt-0.5 text-sm text-admin-subtle">
            {isBridge ? (order!.customerName || "—") : "Hors commande"}
          </p>
        </motion.header>

        {isBridge ? (
          <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-admin-accent">
            Depuis la commande
          </p>
        ) : null}

        <AdminInput
          label="Client"
          name="customerName"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nom ou pseudo"
          disabled={isBridge}
        />

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-muted">
              Lignes ({lines.length})
            </h2>
            {!isBridge ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-[11px] uppercase tracking-wider text-admin-accent font-medium tap-scale"
              >
                Ajouter un parfum
              </button>
            ) : null}
          </div>

          {lines.length === 0 ? (
            <SectionCard className="p-6 text-center border-dashed border-admin-border">
              <ReceiptText
                className="mx-auto mb-2 h-8 w-8 text-admin-accent/80"
                aria-hidden
                strokeWidth={1.5}
              />
              <p className="text-[13px] text-admin-muted">Ajoute un parfum, puis enregistre la vente.</p>
            </SectionCard>
          ) : (
            <div className="flex flex-col gap-2">
              {lines.map((line) => (
                <SaleLineEditor
                  key={line.key}
                  line={line}
                  isBridge={isBridge}
                  onUpdate={(patch) => updateLine(line.key, patch)}
                  onRemove={() => removeLine(line.key)}
                />
              ))}
            </div>
          )}

          {!isBridge ? (
            <AdminButton
              type="button"
              variant="outline"
              size="md"
              leftIcon={Plus}
              className="w-full"
              onClick={() => setPickerOpen(true)}
            >
              Ajouter un parfum
            </AdminButton>
          ) : null}
        </section>

        <div>
          <label
            htmlFor="sale-notes"
            className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-admin-muted"
          >
            Notes
          </label>
          <textarea
            id="sale-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="—"
            className="block w-full rounded-xl bg-admin-surface border border-admin-border px-4 py-3 text-[16px] text-admin-text placeholder:text-admin-subtle transition-colors focus-visible:border-admin-accent focus-visible:outline-none"
          />
        </div>
      </main>

      <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[55] w-full max-w-[430px] px-5 space-y-3 pointer-events-none">
        <SectionCard className="p-4 bg-admin-surface/95 backdrop-blur-xl border-admin-border-hover pointer-events-auto">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="CA" value={formatMoney(totals.revenue)} />
            <StatCard
              label="Marge"
              value={formatMoney(totals.margin)}
              tone={totals.margin >= 0 ? "success" : "danger"}
              hint={totals.revenue > 0 ? `${totals.marginPercent.toFixed(0)}%` : undefined}
            />
            <StatCard label="Coût" value={formatMoney(totals.cost)} />
          </div>
        </SectionCard>
        <AdminButton
          type="button"
          variant="primary"
          size="lg"
          className="w-full pointer-events-auto"
          leftIcon={ReceiptText}
          isLoading={saving}
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {isBridge ? "Encaisser la commande" : "Valider la vente"}
        </AdminButton>
      </div>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addPerfume}
      />

      {toast ? (
        <AdminToast type={toast.type} message={toast.text} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}

function SaleLineEditor({
  line,
  isBridge,
  onUpdate,
  onRemove,
}: {
  line: Line;
  isBridge: boolean;
  onUpdate: (patch: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const margin = lineMargin(line);
  const revenue = lineRevenue(line);
  const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

  return (
    <SectionCard className="p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-9 rounded-xl overflow-hidden bg-admin-bg border border-admin-border shrink-0">
          <Image
            loader={nureaAdminThumbLoader}
            src={line.perfume.image}
            alt={line.perfume.name}
            fill
            className="object-cover"
            sizes="36px"
            quality={60}
            fetchPriority="low"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[14px] leading-tight tracking-[-0.01em] text-admin-text truncate">
            {line.perfume.name}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-admin-subtle truncate">
            {line.perfume.brand.name}
          </p>
        </div>
        {!isBridge ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Retirer cette ligne"
            className="h-9 w-9 flex items-center justify-center rounded-xl text-admin-subtle tap-scale [@media(hover:hover)]:hover:text-admin-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-admin-subtle">
          Volume
        </label>
        <div className="mb-3 flex gap-1">
          {ORDER_VOLUMES_ML.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onUpdate({ volumeMl: v })}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-center text-[12px] font-semibold",
                line.volumeMl === v
                  ? "bg-admin-accent text-white"
                  : "border border-admin-border bg-admin-bg text-admin-muted",
              )}
            >
              {v} ml
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-admin-subtle mb-1">Qté</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={line.quantity}
            onChange={(e) =>
              onUpdate({ quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
            }
            disabled={isBridge}
            className="block w-full min-h-11 rounded-xl bg-admin-surface border border-admin-border px-3 text-[16px] tabular-nums text-admin-text focus-visible:border-admin-accent focus-visible:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] uppercase leading-tight text-admin-subtle">
            Prix client (€)
          </label>
          <p className="mb-1.5 text-[8px] font-normal normal-case text-admin-muted">
            Ce que le client paie
          </p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex. 35"
            value={line.unitPrice}
            onChange={(e) => onUpdate({ unitPrice: e.target.value })}
            title="Montant facturé au client pour ce flacon (prix de vente)"
            aria-label="Prix client, montant facturé pour ce flacon"
            className="block w-full min-h-11 rounded-xl bg-admin-surface border border-admin-border px-3 text-[16px] tabular-nums text-admin-text placeholder:text-admin-subtle focus-visible:border-admin-accent focus-visible:outline-none"
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] uppercase leading-tight text-admin-subtle">
            Mon achat (€)
          </label>
          <p className="mb-1.5 text-[8px] font-normal normal-case text-admin-muted">
            Ce que le flacon te coûte
          </p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="ex. 10,86"
            value={line.unitCost}
            onChange={(e) => onUpdate({ unitCost: e.target.value })}
            title="Prix d’achat : à combien tu l’as eu le flacon (revient)"
            aria-label="Mon prix d'achat du flacon (revient)"
            className="block w-full min-h-11 rounded-xl bg-admin-surface border border-admin-border px-3 text-[16px] tabular-nums text-admin-text placeholder:text-admin-subtle focus-visible:border-admin-accent focus-visible:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-admin-border text-[12px] tabular-nums">
        <span className="text-admin-muted">{formatMoney(revenue)}</span>
        <span
          className={cn(
            "font-medium",
            margin >= 0 ? "text-[var(--admin-success)]" : "text-admin-danger",
          )}
        >
          {margin >= 0 ? "+" : ""}
          {formatMoney(margin)}
          {revenue > 0 ? ` (${marginPercent.toFixed(0)}%)` : ""}
        </span>
      </div>
    </SectionCard>
  );
}
