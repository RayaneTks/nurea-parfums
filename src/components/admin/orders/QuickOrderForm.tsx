"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { CheckCircle2, PlusCircle, Trash2 } from "lucide-react";
import { CustomerCombobox, type SelectedCustomer } from "../customers/CustomerCombobox";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Stepper } from "@/ui/primitives/Stepper";
import { Money } from "@/ui/patterns/Money";
import { createOrderAction } from "@/server/orders/actions";
import type { CreateOrderInput, OrderItemInput } from "@/schemas/order";
import type { PickerResult } from "@/features/sell";

const PerfumePicker = dynamic(
  () => import("@/features/sell").then((m) => m.PerfumePicker),
  { ssr: false },
);

type LineSnapshot = { name: string; brandName: string; image: string | null };

type LineState = {
  perfumeId: number | null;
  snapshot: LineSnapshot;
  quantity: number;
  volumeMl: 30 | 50 | 100;
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
};

const VOLUME_OPTIONS = [
  { value: "30", label: "30 ml" },
  { value: "50", label: "50 ml" },
  { value: "100", label: "100 ml" },
] as const;

function toNum(v: string | number): number {
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

async function fetchPricing(perfumeId: number, volumeMl: number): Promise<{
  defaultUnitPriceEur: string;
  defaultUnitCostDzd: string | null;
} | null> {
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
    return (json as { row: { defaultUnitPriceEur: string; defaultUnitCostDzd: string | null } }).row;
  }
  return null;
}

export function QuickOrderForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [line, setLine] = useState<LineState | null>(null);
  const [depositOn, setDepositOn] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [exchangeRateDefault] = useState("277");

  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const total = useMemo(
    () => (line ? toNum(line.unitPrice) * line.quantity : 0),
    [line],
  );

  const onSelectPerfume = useCallback(
    async (result: PickerResult) => {
      if (result.kind === "catalog") {
        const p = result.perfume;
        const pricing = await fetchPricing(p.id, 100);
        setLine({
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
          exchangeRate: exchangeRateDefault,
        });
      } else {
        setLine({
          perfumeId: null,
          snapshot: { name: result.name, brandName: result.brandName, image: null },
          quantity: 1,
          volumeMl: 100,
          unitPrice: "",
          unitCostDzd: "",
          exchangeRate: exchangeRateDefault,
        });
      }
      setPickerOpen(false);
    },
    [exchangeRateDefault],
  );

  const onChangeVolume = useCallback(
    async (v: 30 | 50 | 100) => {
      if (!line) return;
      if (line.perfumeId !== null) {
        const pricing = await fetchPricing(line.perfumeId, v);
        setLine({
          ...line,
          volumeMl: v,
          unitPrice: pricing?.defaultUnitPriceEur ?? line.unitPrice,
          unitCostDzd: pricing?.defaultUnitCostDzd ?? line.unitCostDzd,
        });
      } else {
        setLine({ ...line, volumeMl: v });
      }
    },
    [line],
  );

  const submit = useCallback(() => {
    if (!line) {
      setToast({ type: "error", message: "Ajoute un parfum." });
      return;
    }
    const name = customer?.fullName ?? customerName.trim();
    if (name.length < 2) {
      setToast({ type: "error", message: "Indique un client." });
      return;
    }
    if (toNum(line.unitPrice) <= 0) {
      setToast({ type: "error", message: "Renseigne le prix unitaire." });
      return;
    }
    if (depositOn && toNum(depositAmount) <= 0) {
      setToast({ type: "error", message: "Acompte coché → montant > 0." });
      return;
    }

    const items: OrderItemInput[] = [
      {
        perfumeId: line.perfumeId,
        perfumeSnapshot: line.perfumeId === null ? line.snapshot : undefined,
        quantity: line.quantity,
        volumeMl: line.volumeMl,
        unitPrice: line.unitPrice.replace(",", "."),
        unitCostDzd: line.unitCostDzd === "" ? "0" : line.unitCostDzd.replace(",", "."),
        exchangeRate: line.exchangeRate === "" ? "0" : line.exchangeRate.replace(",", "."),
        note: null,
      },
    ];

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
  }, [customer, customerName, depositAmount, depositOn, line, router]);

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
              />
            ) : null}
          </Stack>
        </Card>

        <Card padding={3}>
          <HStack justify="between" align="center" className="mb-3">
            <h2 className="text-[13px] font-semibold text-[var(--admin-text)]">Parfum</h2>
            {line ? (
              <button
                type="button"
                onClick={() => setLine(null)}
                className="inline-flex items-center gap-1 text-[12px] text-[var(--admin-danger)] tap-scale"
                aria-label="Retirer le parfum"
              >
                <Trash2 size={12} /> Retirer
              </button>
            ) : null}
          </HStack>

          {!line ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              leadingIcon={<PlusCircle size={16} />}
              onClick={() => setPickerOpen(true)}
            >
              Choisir un parfum
            </Button>
          ) : (
            <Stack gap={3}>
              <div
                className="flex items-center gap-3 rounded-[12px] p-2.5"
                style={{
                  background: "var(--admin-surface-alt)",
                  border: "1px solid var(--admin-border)",
                }}
              >
                <div
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px]"
                  style={{ background: "var(--admin-surface-muted)" }}
                >
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
                  <p className="truncate text-[14px] font-medium text-[var(--admin-text)]">
                    {line.snapshot.name}
                    {line.perfumeId === null ? (
                      <span
                        className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]"
                        style={{
                          background: "var(--admin-accent-bg)",
                          color: "var(--admin-accent)",
                        }}
                      >
                        Saisie libre
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[12px] text-[var(--admin-text-subtle)]">
                    {line.snapshot.brandName}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--admin-text-muted)]">
                  Volume
                </label>
                <SegmentedControl
                  options={VOLUME_OPTIONS}
                  value={String(line.volumeMl) as "30" | "50" | "100"}
                  onChange={(v) => void onChangeVolume(Number(v) as 30 | 50 | 100)}
                  ariaLabel="Volume en ml"
                />
              </div>

              <HStack justify="between" align="center">
                <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">
                  Quantité
                </span>
                <Stepper
                  value={line.quantity}
                  onChange={(q) => setLine({ ...line, quantity: q })}
                  min={1}
                  ariaLabel="Quantité"
                />
              </HStack>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Prix unitaire €"
                  inputMode="decimal"
                  variant="elevated"
                  value={line.unitPrice}
                  onChange={(e) => setLine({ ...line, unitPrice: e.target.value })}
                  placeholder="120"
                />
                <Input
                  label="Coût DZD (opt.)"
                  inputMode="decimal"
                  variant="elevated"
                  value={line.unitCostDzd}
                  onChange={(e) => setLine({ ...line, unitCostDzd: e.target.value })}
                  placeholder="36000"
                />
              </div>
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
              />
            </div>
          ) : null}
        </Card>

        <Card padding={3}>
          <HStack justify="between" align="center">
            <span className="text-[12px] text-[var(--admin-text-subtle)]">Total commande</span>
            <Money value={total} bold className="text-[18px]" />
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
        excludedIds={line && line.perfumeId !== null ? [line.perfumeId] : []}
      />

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
