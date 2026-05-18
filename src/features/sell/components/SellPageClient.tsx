"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Plus, Receipt } from "lucide-react";
import { Heading } from "@/ui/primitives/Heading";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Badge } from "@/ui/primitives/Badge";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Money } from "@/ui/patterns/Money";
import { PerfumePicker, type PickerResult } from "./PerfumePicker";
import { SellLineRow, type SellLine } from "./SellLineRow";
import { CustomerCombobox, type SelectedCustomer } from "@/components/admin/customers/CustomerCombobox";

function toNum(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function makeKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type FromOrder = {
  id: string;
  customerName: string | null;
  customerContact: string | null;
  items: Array<{
    perfumeId: number | null;
    quantity: number;
    volumeMl: number | null;
    unitPrice: string;
    unitCostDzd: string | null;
    exchangeRate: string | null;
    perfume: { id: number; name: string; image: string; brand: { name: string } } | null;
    perfumeSnapshot?: unknown;
  }>;
};

function isVol(v: number | null): v is 30 | 50 | 100 {
  return v === 30 || v === 50 || v === 100;
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
    const json = (await r.json()) as { row?: PricingPayload };
    return json.row ?? null;
  } catch {
    return null;
  }
}

export function SellPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOrderId = searchParams.get("fromOrder");

  const [bridge, setBridge] = useState<FromOrder | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState<boolean>(!!fromOrderId);
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [lines, setLines] = useState<SellLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // Charge order si bridge.
  useEffect(() => {
    if (!fromOrderId) return;
    setBridgeLoading(true);
    fetch(`/api/admin/orders/${fromOrderId}`, { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Commande introuvable.");
        const j = (await r.json()) as { order: FromOrder };
        return j.order;
      })
      .then((order) => {
        setBridge(order);
        setCustomerName(order.customerName ?? "");
        setCustomerContact(order.customerContact ?? "");
        setLines(
          order.items.map((it) => {
            const snap =
              it.perfumeSnapshot && typeof it.perfumeSnapshot === "object"
                ? (it.perfumeSnapshot as { name?: string; brandName?: string; image?: string })
                : null;
            return {
              key: makeKey(),
              perfumeId: it.perfumeId,
              snapshot: {
                name: it.perfume?.name ?? snap?.name ?? "Hors catalogue",
                brandName: it.perfume?.brand.name ?? snap?.brandName ?? "—",
                image: it.perfume?.image ?? snap?.image ?? null,
              },
              quantity: it.quantity,
              volumeMl: isVol(it.volumeMl) ? it.volumeMl : 100,
              unitPrice: it.unitPrice,
              unitCostDzd: it.unitCostDzd ?? "",
              exchangeRate: it.exchangeRate ?? "277",
            };
          }),
        );
      })
      .catch(() => setToast({ type: "error", message: "Impossible de charger la commande." }))
      .finally(() => setBridgeLoading(false));
  }, [fromOrderId]);

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

  const handlePickerSelect = useCallback(async (result: PickerResult) => {
    if (result.kind === "catalog") {
      const pricing = await fetchPricing(result.perfume.id, 100);
      setLines((prev) => [
        ...prev,
        {
          key: makeKey(),
          perfumeId: result.perfume.id,
          snapshot: {
            name: result.perfume.name,
            brandName: result.perfume.brand?.name ?? "—",
            image: result.perfume.image ?? null,
          },
          quantity: 1,
          volumeMl: 100,
          unitPrice: pricing?.defaultUnitPriceEur ?? "",
          unitCostDzd: pricing?.defaultUnitCostDzd ?? "",
          exchangeRate: pricing?.defaultExchangeRate ?? "277",
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
          exchangeRate: "277",
        },
      ]);
    }
  }, []);

  const patchLine = useCallback((key: string, patch: Partial<SellLine>) => {
    if (patch.volumeMl !== undefined) {
      const target = lines.find((l) => l.key === key);
      if (target?.perfumeId !== null && target?.perfumeId !== undefined && patch.volumeMl !== target.volumeMl) {
        void fetchPricing(target.perfumeId, patch.volumeMl).then((pricing) => {
          setLines((prev) =>
            prev.map((l) =>
              l.key === key
                ? {
                    ...l,
                    ...patch,
                    ...(pricing
                      ? {
                          unitPrice: pricing.defaultUnitPriceEur,
                          unitCostDzd: pricing.defaultUnitCostDzd ?? l.unitCostDzd,
                          exchangeRate: pricing.defaultExchangeRate ?? l.exchangeRate,
                        }
                      : {}),
                  }
                : l,
            ),
          );
        });
        return;
      }
    }
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, [lines]);

  const removeLine = useCallback((key: string) =>
    setLines((prev) => prev.filter((l) => l.key !== key)), []);

  const submit = () => {
    if (lines.length === 0) {
      setToast({ type: "error", message: "Ajoute au moins une ligne." });
      return;
    }
    for (const l of lines) {
      if (toNum(l.unitPrice) <= 0) {
        setToast({ type: "error", message: `Prix manquant : ${l.snapshot.name}` });
        return;
      }
    }
    startTransition(async () => {
      const payload = {
        orderId: bridge?.id ?? null,
        customerId: customer?.id ?? null,
        customerName: (customer?.fullName ?? customerName).trim() || null,
        customerContact: customerContact.trim() || null,
        items: lines.map((l) => ({
          perfumeId: l.perfumeId,
          perfumeSnapshot: l.perfumeId === null ? l.snapshot : undefined,
          quantity: l.quantity,
          volumeMl: l.volumeMl,
          unitPrice: l.unitPrice.replace(",", "."),
          unitCostDzd: l.unitCostDzd === "" ? "0" : l.unitCostDzd.replace(",", "."),
          exchangeRate: l.exchangeRate === "" ? "0" : l.exchangeRate.replace(",", "."),
        })),
      };
      const r = await fetch("/api/admin/sales", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        setToast({ type: "error", message: err.error ?? "Échec enregistrement." });
        return;
      }
      setToast({ type: "success", message: "Vente enregistrée." });
      router.push("/admin/compta");
      router.refresh();
    });
  };

  return (
    <>
      <Stack gap={4}>
        <Link
          href={bridge ? `/admin/ordres/${bridge.id}` : "/admin/ordres"}
          className="inline-flex w-fit items-center gap-1 text-[13px] text-[var(--admin-text-muted)] tap-scale hover:text-[var(--admin-text)]"
        >
          <ArrowLeft size={14} /> {bridge ? "Commande" : "Commandes"}
        </Link>

        <header>
          <Heading level={1}>{bridge ? "Encaisser" : "Vendre"}</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
            {bridge
              ? `Encaissement de la commande de ${bridge.customerName ?? "client"}.`
              : "Vente directe sans commande préalable."}
          </p>
        </header>

        {bridge ? (
          <Card padding={3} tone="accent">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2">
                <Receipt size={14} className="text-[var(--admin-accent)]" aria-hidden />
                <span className="text-[13px] font-medium text-[var(--admin-text)]">
                  Commande #{bridge.id.slice(-8)}
                </span>
              </span>
              <Badge tone="accent" size="sm">
                Bridge
              </Badge>
            </div>
          </Card>
        ) : null}

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
                  setCustomerName(c?.fullName ?? "");
                  if (c?.phoneE164) setCustomerContact(c.phoneE164);
                }}
                placeholder="Rechercher ou créer…"
              />
            </div>
            {!customer ? (
              <Input
                label="Nom (saisie libre)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Anonyme si vide"
                autoComplete="off"
                variant="elevated"
                hint="Rattache une fiche existante via le sélecteur."
                enterKeyHint="next"
              />
            ) : null}
            <Input
              label="Contact (optionnel)"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="Téléphone, Snapchat, Instagram…"
              autoComplete="off"
              variant="elevated"
              enterKeyHint="done"
            />
          </Stack>
        </Card>

        {bridgeLoading ? (
          <Card padding={4}>
            <p className="text-center text-[14px] text-[var(--admin-text-muted)]">
              Chargement…
            </p>
          </Card>
        ) : lines.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Aucun parfum"
            description="Ajoute au moins un parfum pour calculer le ticket."
          />
        ) : (
          <Stack gap={2}>
            {lines.map((line) => (
              <SellLineRow
                key={line.key}
                line={line}
                onPatch={patchLine}
                onRemove={removeLine}
              />
            ))}
          </Stack>
        )}

        <Button
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          leadingIcon={<Plus size={16} />}
          onClick={() => setPickerOpen(true)}
        >
          Ajouter un parfum
        </Button>

        <Card padding={3}>
          <HStack justify="between" align="end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                Total ticket
              </p>
              <p className="mt-1">
                <Money value={totals.revenue} bold className="text-[22px]" />
              </p>
            </div>
            {totals.cost > 0 ? (
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                  Marge
                </p>
                <p className="mt-1">
                  <Money value={totals.margin} bold tone="success" />
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                  {totals.marginPct.toFixed(0)}%
                </p>
              </div>
            ) : null}
          </HStack>
        </Card>

        <StickyAction>
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={submitting}
            onClick={submit}
            leadingIcon={<CheckCircle2 size={16} />}
          >
            Enregistrer la vente
          </Button>
        </StickyAction>
      </Stack>

      <PerfumePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(result) => void handlePickerSelect(result)}
        excludedIds={lines.map((l) => l.perfumeId).filter((id): id is number => id !== null)}
      />

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
