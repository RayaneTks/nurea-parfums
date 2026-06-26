"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { GiftToggle } from "@/ui/patterns/GiftToggle";
import { CustomerCombobox, type SelectedCustomer } from "../customers/CustomerCombobox";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Chip } from "@/ui/primitives/Chip";
import { Stepper } from "@/ui/primitives/Stepper";
import { Money } from "@/ui/patterns/Money";
import { createOrderAction } from "@/server/orders/actions";
import type { CreateOrderInput, OrderItemInput } from "@/schemas/order";
import type { PickerResult } from "@/features/sell";

const PerfumePicker = dynamic(
  () => import("@/features/sell").then((m) => m.PerfumePicker),
  { ssr: false },
);

type LineState = {
  key: string;
  perfumeId: number | null;
  snapshot: { name: string; brandName: string; image: string | null };
  quantity: number;
  volumeMl: 30 | 50 | 100;
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
  isGift?: boolean;
};

const VOLUMES = [30, 50, 100] as const;

function toNum(v: string | number): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

function makeKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type PricingPayload = {
  defaultUnitPriceEur: string;
  defaultUnitCostDzd: string | null;
  defaultExchangeRate: string | null;
};

async function fetchPricing(perfumeId: number, volumeMl: number): Promise<PricingPayload | null> {
  const r = await fetch(`/api/admin/perfumes/${perfumeId}/pricing?volumeMl=${volumeMl}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!r.ok) return null;
  const json = (await r.json()) as unknown;
  if (
    typeof json === "object" &&
    json !== null &&
    "row" in json &&
    typeof (json as { row: unknown }).row === "object" &&
    (json as { row: unknown }).row !== null
  ) {
    return (json as { row: PricingPayload }).row;
  }
  return null;
}

export function QuickOrderForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lines, setLines] = useState<LineState[]>([]);
  const [depositOn, setDepositOn] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [exchangeRateDefault] = useState("277");

  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const l of lines) {
      const price = toNum(l.unitPrice);
      revenue += price * l.quantity;
      const dzd = toNum(l.unitCostDzd);
      const rate = toNum(l.exchangeRate);
      const unitCost = dzd > 0 && rate > 0 ? dzd / rate : 0;
      cost += unitCost * l.quantity;
    }
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, cost, margin, marginPct };
  }, [lines]);

  const onSelectPerfume = useCallback(
    async (result: PickerResult) => {
      setPickerOpen(false);
      if (result.kind === "catalog") {
        const p = result.perfume;
        const pricing = await fetchPricing(p.id, 100);
        setLines((prev) => [
          ...prev,
          {
            key: makeKey(),
            perfumeId: p.id,
            snapshot: {
              name: p.name,
              brandName: p.brand?.name ?? "—",
              image: p.image ?? null,
            },
            quantity: 1,
            volumeMl: 100,
            unitPrice: pricing?.defaultUnitPriceEur ?? "",
            unitCostDzd: pricing?.defaultUnitCostDzd ?? "",
            exchangeRate: pricing?.defaultExchangeRate ?? exchangeRateDefault,
          },
        ]);
      } else {
        setLines((prev) => [
          ...prev,
          {
            key: makeKey(),
            perfumeId: null,
            snapshot: { name: result.name, brandName: result.brandName, image: null },
            quantity: 1,
            volumeMl: 100,
            unitPrice: "",
            unitCostDzd: "",
            exchangeRate: exchangeRateDefault,
          },
        ]);
      }
    },
    [exchangeRateDefault],
  );

  const patchLine = useCallback((key: string, patch: Partial<LineState>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const onChangeVolume = useCallback(
    async (key: string, v: 30 | 50 | 100) => {
      const line = lines.find((l) => l.key === key);
      if (!line) return;
      if (line.perfumeId !== null) {
        const pricing = await fetchPricing(line.perfumeId, v);
        setLines((prev) =>
          prev.map((l) =>
            l.key === key
              ? {
                  ...l,
                  volumeMl: v,
                  unitPrice: pricing?.defaultUnitPriceEur ?? l.unitPrice,
                  unitCostDzd: pricing?.defaultUnitCostDzd ?? l.unitCostDzd,
                  exchangeRate: pricing?.defaultExchangeRate ?? l.exchangeRate,
                }
              : l,
          ),
        );
      } else {
        patchLine(key, { volumeMl: v });
      }
    },
    [lines, patchLine],
  );

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const submit = useCallback(() => {
    if (lines.length === 0) {
      setToast({ type: "error", message: "Ajoute au moins un parfum." });
      return;
    }
    const name = customer?.fullName ?? customerName.trim();
    if (name.length < 2) {
      setToast({ type: "error", message: "Indique un client." });
      return;
    }
    for (const l of lines) {
      if (!l.isGift && toNum(l.unitPrice) <= 0) {
        setToast({ type: "error", message: `Prix manquant : ${l.snapshot.name}` });
        return;
      }
    }
    if (depositOn && toNum(depositAmount) <= 0) {
      setToast({ type: "error", message: "Acompte coché → montant > 0." });
      return;
    }

    const items: OrderItemInput[] = lines.map((l) => ({
      perfumeId: l.perfumeId,
      perfumeSnapshot: l.perfumeId === null ? l.snapshot : undefined,
      quantity: l.quantity,
      volumeMl: l.volumeMl,
      isGift: !!l.isGift,
      unitPrice: l.isGift ? "0" : l.unitPrice.replace(",", "."),
      unitCostDzd: l.unitCostDzd === "" ? "0" : l.unitCostDzd.replace(",", "."),
      exchangeRate: l.exchangeRate === "" ? "0" : l.exchangeRate.replace(",", "."),
      note: null,
    }));

    const payload: CreateOrderInput = {
      customerId: customer?.id ?? null,
      customerName: name,
      deliveryAt: null,
      notes: null,
      items,
      initialDeposit: depositOn
        ? { amount: depositAmount.replace(",", "."), method: null }
        : null,
    };

    startTransition(async () => {
      const result = await createOrderAction(payload);
      if (!result.ok) {
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({
        type: "success",
        message: result.data.status === "READY" ? "Commande créée et à traiter." : "Commande créée.",
      });
      router.push(`/admin/ordres/${result.data.id}`);
      router.refresh();
    });
  }, [customer, customerName, depositAmount, depositOn, lines, router]);

  return (
    <>
      <Stack gap={3}>
        <Card padding={3}>
          <Stack gap={3}>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--admin-text-muted)]">
                Client
              </label>
              <CustomerCombobox
                value={customer}
                onChange={(c) => {
                  setCustomer(c);
                  if (c) setCustomerName(c.fullName);
                }}
                placeholder="Choisir ou créer un client…"
              />
            </div>
            {customer === null ? (
              <Input
                label="Ou nom seul (sans fiche)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Prénom Nom"
                autoComplete="off"
                enterKeyHint="done"
              />
            ) : null}
          </Stack>
        </Card>

        <Card padding={3}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[var(--admin-text)]">
              Parfums {lines.length > 0 ? `(${lines.length})` : ""}
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leadingIcon={<Plus size={14} />}
              onClick={() => setPickerOpen(true)}
            >
              Ajouter
            </Button>
          </div>

          {lines.length === 0 ? (
            <p className="py-2 text-[13px] text-[var(--admin-text-muted)]">
              Aucun parfum. Tape « Ajouter » pour choisir.
            </p>
          ) : (
            <Stack gap={2}>
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="flex flex-col gap-2 rounded-[14px] bg-[var(--admin-surface-alt)] px-3 py-3"
                  style={{ border: "1px solid var(--admin-border)" }}
                >
                  <HStack gap={3} align="center">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]">
                      {line.snapshot.image ? (
                        <Image
                          src={line.snapshot.image}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
                        {line.snapshot.name}
                        {line.perfumeId === null ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-[var(--admin-warning-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[var(--admin-warning)]">
                            Libre
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--admin-text-subtle)]">
                        {line.snapshot.brandName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      aria-label="Retirer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--admin-danger)] tap-scale hover:bg-[var(--admin-danger-bg)]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </HStack>

                  <HStack gap={2} align="center">
                    <span className="w-[64px] text-[12px] text-[var(--admin-text-muted)]">Volume</span>
                    <div className="flex gap-1.5">
                      {VOLUMES.map((v) => (
                        <Chip
                          key={v}
                          active={line.volumeMl === v}
                          onClick={() => void onChangeVolume(line.key, v)}
                          ariaLabel={`${v} ml`}
                        >
                          {v} ml
                        </Chip>
                      ))}
                    </div>
                  </HStack>

                  <HStack gap={2} align="center">
                    <span className="w-[64px] text-[12px] text-[var(--admin-text-muted)]">Qté</span>
                    <Stepper
                      value={line.quantity}
                      onChange={(q) => patchLine(line.key, { quantity: q })}
                      min={1}
                    />
                    <GiftToggle
                      active={!!line.isGift}
                      onToggle={() =>
                        patchLine(
                          line.key,
                          line.isGift ? { isGift: false } : { isGift: true, unitPrice: "0" },
                        )
                      }
                    />
                    <div className="ml-auto">
                      {line.isGift ? (
                        <span className="text-[14px] font-bold text-[var(--admin-accent)]">Offert</span>
                      ) : (
                        <Money value={toNum(line.unitPrice) * line.quantity} bold />
                      )}
                    </div>
                  </HStack>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      label="Prix €"
                      numeric
                      inputMode="decimal"
                      value={line.isGift ? "0" : line.unitPrice}
                      disabled={line.isGift}
                      onChange={(e) => patchLine(line.key, { unitPrice: e.target.value })}
                      placeholder="120"
                      enterKeyHint="next"
                    />
                    <Input
                      label="Coût DZD"
                      numeric
                      inputMode="decimal"
                      value={line.unitCostDzd}
                      onChange={(e) => patchLine(line.key, { unitCostDzd: e.target.value })}
                      placeholder="36000"
                      enterKeyHint="next"
                    />
                    <Input
                      label="Taux"
                      numeric
                      inputMode="decimal"
                      value={line.exchangeRate}
                      onChange={(e) => patchLine(line.key, { exchangeRate: e.target.value })}
                      placeholder="277"
                      enterKeyHint="done"
                    />
                  </div>
                </div>
              ))}
            </Stack>
          )}
        </Card>

        <Card padding={3}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={depositOn}
              onChange={(e) => setDepositOn(e.target.checked)}
              className="mt-1 h-4 w-4"
              style={{ accentColor: "var(--admin-accent)" }}
            />
            <span className="flex-1">
              <span className="block text-[14px] font-medium text-[var(--admin-text)]">
                Acompte encaissé
              </span>
              <span className="block text-[12px] text-[var(--admin-text-subtle)]">
                Active la transition automatique vers « À traiter ».
              </span>
            </span>
          </label>
          {depositOn ? (
            <div className="mt-3">
              <Input
                label="Montant acompte €"
                inputMode="decimal"
                variant="elevated"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="50"
                enterKeyHint="done"
              />
            </div>
          ) : null}
        </Card>

        <Card padding={3}>
          <HStack justify="between" align="end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                Total commande
              </p>
              <p className="mt-1">
                <Money value={totals.revenue} bold className="text-[18px]" />
              </p>
            </div>
            {totals.cost > 0 ? (
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                  Marge
                </p>
                <p className="mt-1">
                  <Money value={totals.margin} bold tone="auto" />
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                  {totals.marginPct.toFixed(0)}%
                </p>
              </div>
            ) : null}
          </HStack>
        </Card>
      </Stack>

      <StickyAction>
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={pending}
          onClick={submit}
          leadingIcon={<CheckCircle2 size={16} />}
        >
          Créer la commande
        </Button>
      </StickyAction>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => void onSelectPerfume(p)}
        excludedIds={lines.map((l) => l.perfumeId).filter((id): id is number => id !== null)}
      />

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
