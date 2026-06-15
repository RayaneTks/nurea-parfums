"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Money } from "@/ui/patterns/Money";
import { CustomerSection } from "./CustomerSection";
import { ItemsSection } from "./ItemsSection";
import { DepositSection } from "./DepositSection";
import { MetaSection } from "./MetaSection";
import type { OrderFormLine, OrderFormState } from "./types";
import { createOrderAction, updateOrderAction } from "@/server/orders/actions";
import type {
  CreateOrderInput,
  OrderItemInput,
  UpdateOrderInput,
} from "@/schemas/order";
import type { PickerResult } from "@/features/sell";
import type { SelectedCustomer } from "../../customers/CustomerCombobox";

const DEFAULT_EXCHANGE = "277";

type Mode = "create" | "edit";

type OrderFormProps = {
  mode: Mode;
  orderId?: string;
  initial?: {
    customer: SelectedCustomer | null;
    customerName: string;
    deliveryAt: string;
    notes: string;
    items: OrderFormLine[];
  };
};

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
  try {
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
  } catch {
    return null;
  }
}

export function OrderForm({ mode, orderId, initial }: OrderFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const [state, setState] = useState<OrderFormState>(() => ({
    customer: initial?.customer ?? null,
    customerName: initial?.customerName ?? "",
    deliveryAt: initial?.deliveryAt ?? "",
    notes: initial?.notes ?? "",
    items: initial?.items ?? [],
    initialDeposit: mode === "create" ? { on: false, amount: "", method: "" } : null,
  }));

  const orderTotals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const it of state.items) {
      const price = toNum(it.unitPrice);
      revenue += price * it.quantity;
      const dzd = toNum(it.unitCostDzd);
      const rate = toNum(it.exchangeRate);
      const unitCost = dzd > 0 && rate > 0 ? dzd / rate : 0;
      cost += unitCost * it.quantity;
    }
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, cost, margin, marginPct };
  }, [state.items]);

  const onAddItem = useCallback(async (result: PickerResult) => {
    if (result.kind === "catalog") {
      const p = result.perfume;
      const pricing = await fetchPricing(p.id, 100);
      setState((s) => ({
        ...s,
        items: [
          ...s.items,
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
            exchangeRate: pricing?.defaultExchangeRate ?? DEFAULT_EXCHANGE,
            note: "",
          },
        ],
      }));
    } else {
      setState((s) => ({
        ...s,
        items: [
          ...s.items,
          {
            key: makeKey(),
            perfumeId: null,
            snapshot: { name: result.name, brandName: result.brandName, image: null },
            quantity: 1,
            volumeMl: 100,
            unitPrice: "",
            unitCostDzd: "",
            exchangeRate: DEFAULT_EXCHANGE,
            note: "",
          },
        ],
      }));
    }
  }, []);

  const onPatchItem = useCallback(async (key: string, patch: Partial<OrderFormLine>) => {
    // Si changement de volume sur une ligne catalogue, refetch pricing.
    if (patch.volumeMl !== undefined) {
      const target = state.items.find((it) => it.key === key);
      if (target && target.perfumeId !== null && patch.volumeMl !== target.volumeMl) {
        const pricing = await fetchPricing(target.perfumeId, patch.volumeMl);
        if (pricing) {
          patch = {
            ...patch,
            unitPrice: pricing.defaultUnitPriceEur,
            unitCostDzd: pricing.defaultUnitCostDzd ?? "",
            ...(pricing.defaultExchangeRate
              ? { exchangeRate: pricing.defaultExchangeRate }
              : {}),
          };
        }
      }
    }
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    }));
  }, [state.items]);

  const onRemoveItem = useCallback((key: string) => {
    setState((s) => ({ ...s, items: s.items.filter((it) => it.key !== key) }));
  }, []);

  const onQuantityDelta = useCallback((key: string, delta: number) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it) =>
        it.key === key ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it,
      ),
    }));
  }, []);

  const submit = () => {
    const name = state.customer?.fullName ?? state.customerName.trim();
    if (name.length < 2) {
      setToast({ type: "error", message: "Indique un client." });
      return;
    }
    if (state.items.length === 0) {
      setToast({ type: "error", message: "Ajoute au moins une ligne." });
      return;
    }
    for (const it of state.items) {
      if (toNum(it.unitPrice) <= 0) {
        setToast({ type: "error", message: `Prix manquant : ${it.snapshot.name}.` });
        return;
      }
    }
    if (
      mode === "create" &&
      state.initialDeposit?.on &&
      toNum(state.initialDeposit.amount) <= 0
    ) {
      setToast({ type: "error", message: "Acompte coché → montant > 0." });
      return;
    }

    const items: OrderItemInput[] = state.items.map((it) => ({
      perfumeId: it.perfumeId,
      perfumeSnapshot: it.perfumeId === null ? it.snapshot : undefined,
      quantity: it.quantity,
      volumeMl: it.volumeMl,
      unitPrice: it.unitPrice.replace(",", "."),
      unitCostDzd: it.unitCostDzd === "" ? "0" : it.unitCostDzd.replace(",", "."),
      exchangeRate: it.exchangeRate === "" ? "0" : it.exchangeRate.replace(",", "."),
      note: it.note.trim() === "" ? null : it.note,
    }));

    startTransition(async () => {
      if (mode === "create") {
        const payload: CreateOrderInput = {
          customerId: state.customer?.id ?? null,
          customerName: name,
          deliveryAt: state.deliveryAt ? new Date(state.deliveryAt) : null,
          notes: state.notes.trim() === "" ? null : state.notes,
          items,
          initialDeposit: state.initialDeposit?.on
            ? {
                amount: state.initialDeposit.amount.replace(",", "."),
                method: state.initialDeposit.method.trim() || null,
              }
            : null,
        };
        const result = await createOrderAction(payload);
        if (!result.ok) {
          setToast({ type: "error", message: result.error });
          return;
        }
        setToast({ type: "success", message: "Commande créée." });
        router.push(`/admin/ordres/${result.data.id}`);
        router.refresh();
      } else {
        if (!orderId) throw new Error("orderId manquant en mode edit");
        const payload: UpdateOrderInput = {
          customerId: state.customer?.id ?? null,
          customerName: name,
          deliveryAt: state.deliveryAt ? new Date(state.deliveryAt) : null,
          notes: state.notes.trim() === "" ? null : state.notes,
          items,
        };
        const result = await updateOrderAction(orderId, payload);
        if (!result.ok) {
          setToast({ type: "error", message: result.error });
          return;
        }
        setToast({ type: "success", message: "Commande mise à jour." });
        router.push(`/admin/ordres/${orderId}`);
        router.refresh();
      }
    });
  };

  return (
    <PageScaffold
      padding={4}
      formScroll
      ariaLabel={mode === "create" ? "Nouvelle commande" : "Modifier commande"}
    >
      <Stack gap={3}>
        <CustomerSection
          customer={state.customer}
          customerName={state.customerName}
          onCustomerChange={(c) => setState((s) => ({ ...s, customer: c }))}
          onCustomerNameChange={(n) => setState((s) => ({ ...s, customerName: n }))}
        />

        <ItemsSection
          items={state.items}
          exchangeRateDefault={DEFAULT_EXCHANGE}
          onAddItem={onAddItem}
          onPatchItem={onPatchItem}
          onRemoveItem={onRemoveItem}
          onQuantityDelta={onQuantityDelta}
        />

        {mode === "create" && state.initialDeposit ? (
          <DepositSection
            on={state.initialDeposit.on}
            amount={state.initialDeposit.amount}
            method={state.initialDeposit.method}
            onToggle={(on) =>
              setState((s) => ({
                ...s,
                initialDeposit: s.initialDeposit ? { ...s.initialDeposit, on } : null,
              }))
            }
            onAmountChange={(amount) =>
              setState((s) => ({
                ...s,
                initialDeposit: s.initialDeposit ? { ...s.initialDeposit, amount } : null,
              }))
            }
            onMethodChange={(method) =>
              setState((s) => ({
                ...s,
                initialDeposit: s.initialDeposit ? { ...s.initialDeposit, method } : null,
              }))
            }
          />
        ) : null}

        <MetaSection
          deliveryAt={state.deliveryAt}
          notes={state.notes}
          onDeliveryChange={(v) => setState((s) => ({ ...s, deliveryAt: v }))}
          onNotesChange={(v) => setState((s) => ({ ...s, notes: v }))}
        />

        <Card padding={3} tone="alt">
          <HStack justify="between" align="end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                Total commande
              </p>
              <p className="mt-1">
                <Money value={orderTotals.revenue} bold className="text-[18px]" />
              </p>
            </div>
            {orderTotals.cost > 0 ? (
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                  Marge
                </p>
                <p className="mt-1">
                  <Money value={orderTotals.margin} bold tone="success" />
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                  {orderTotals.marginPct.toFixed(0)}%
                </p>
              </div>
            ) : null}
          </HStack>
        </Card>

        <div className="admin-sticky-cta-spacer" aria-hidden />
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
          {mode === "create" ? "Créer la commande" : "Enregistrer"}
        </Button>
      </StickyAction>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </PageScaffold>
  );
}
