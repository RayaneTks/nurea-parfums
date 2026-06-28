"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Receipt } from "lucide-react";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";
import { Money } from "@/ui/patterns/Money";
import { ComptaHeader } from "./ComptaHeader";
import { ComptaKpiRow } from "./ComptaKpiRow";
import { ComptaTrendChart } from "./ComptaTrendChart";
import { CustomerGroupSection } from "./CustomerGroupSection";
import { BatchGroupSection } from "./BatchGroupSection";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { TicketSheet } from "./TicketSheet";
import type { ComptaListResult } from "@/server/sales/queries";

type ComptaListClientProps = {
  initial: ComptaListResult;
  initialQuery: string;
};

export function ComptaListClient({ initial, initialQuery }: ComptaListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ComptaListResult>(initial);
  const [query, setQuery] = useState<string>(initialQuery);
  const [pending, startTransition] = useTransition();
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (query.trim().length > 0) params.set("q", query.trim());
    else params.delete("q");

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;

    const t = setTimeout(() => {
      startTransition(() => {
        router.replace(`/admin/compta${next ? `?${next}` : ""}`, { scroll: false });
      });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  // Auto-open ticket via deep link `?sale=<id>` (utile depuis /admin/lots/[id]).
  useEffect(() => {
    const saleParam = searchParams.get("sale");
    if (!saleParam) return;
    setOpenSaleId(saleParam);
    setSheetOpen(true);
    // Nettoie l'URL pour ne pas rouvrir la sheet à chaque navigation arrière.
    const params = new URLSearchParams(searchParams);
    params.delete("sale");
    router.replace(`/admin/compta${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useMemo(
    () => async () => {
      setRefreshing(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        const r = await fetch(`/api/admin/compta?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) {
          setFetchError("Impossible de charger la compta. Réessaie.");
          return;
        }
        const next = (await r.json()) as ComptaListResult;
        setData(next);
      } catch {
        setFetchError("Réseau indisponible. Vérifie ta connexion.");
      } finally {
        setRefreshing(false);
      }
    },
    [query],
  );

  const chartSales = useMemo(
    () => [
      ...data.batchGroups.flatMap((g) => g.sales),
      ...data.customerGroups.flatMap((g) => g.sales),
    ],
    [data],
  );

  const handleOpenSale = (saleId: string) => {
    setOpenSaleId(saleId);
    setSheetOpen(true);
  };

  const showLoadingState = pending || refreshing;
  const orderRows = data.orderRows ?? [];
  const hasAny =
    data.batchGroups.length > 0 ||
    data.customerGroups.length > 0 ||
    orderRows.length > 0;

  return (
    <>
      <Stack gap={4}>
        <ComptaHeader query={query} onQueryChange={setQuery} />
        <ComptaKpiRow
          summary={data.summary}
          salesCashed={data.summary.salesCashed}
          ordersCashed={data.summary.ordersCashed}
          salesDue={data.summary.salesDue}
          ordersDue={data.summary.ordersDue}
        />

        {fetchError ? (
          <EmptyState
            icon={AlertCircle}
            title="Chargement échoué"
            description={fetchError}
            action={
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-[13px] font-medium text-[var(--admin-accent)] tap-scale"
              >
                Réessayer
              </button>
            }
          />
        ) : null}

        {!fetchError && query.trim().length === 0 && data.summary.salesCount > 0 ? (
          <ComptaTrendChart sales={chartSales} />
        ) : null}

        {!fetchError && !hasAny ? (
          showLoadingState ? (
            <SkeletonList count={4} />
          ) : (
            <EmptyState
              icon={Receipt}
              title={query.trim().length > 0 ? "Aucun résultat" : "Aucune vente"}
              description={
                query.trim().length > 0
                  ? `Rien ne correspond à « ${query.trim()} ». Essaie un autre nom.`
                  : "Enregistre une vente depuis Vendre pour commencer le suivi."
              }
            />
          )
        ) : !fetchError && hasAny ? (
          <Stack gap={3}>
            {showLoadingState ? <Skeleton height={2} /> : null}

            {orderRows.length > 0 ? (
              <Stack gap={2}>
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--admin-text-subtle)]">
                  Commandes en cours ({orderRows.length})
                </p>
                <Card padding={0}>
                  <ul className="divide-y px-3" style={{ borderColor: "var(--admin-border)" }}>
                    {orderRows.map((o) => {
                      const due = Number(o.due);
                      return (
                        <li key={o.id}>
                          <Link
                            href={`/admin/ordres/${o.id}`}
                            prefetch
                            className="flex items-center justify-between gap-3 py-3 tap-scale"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold text-[var(--admin-text)]">
                                {o.customerName}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5">
                                <OrderStatusBadge status={o.status} />
                                {due > 0.005 ? (
                                  <span className="text-[12px] font-medium text-[var(--admin-warning)] tabular-nums">
                                    · <Money value={o.due} compact /> dû
                                  </span>
                                ) : null}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <Money value={o.cashed} bold />
                              <span className="mt-0.5 block text-[11px] text-[var(--admin-text-subtle)]">
                                encaissé
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </Stack>
            ) : null}

            {data.batchGroups.length > 0 ? (
              <Stack gap={2}>
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--admin-text-subtle)]">
                  Lots ({data.batchGroups.length})
                </p>
                {data.batchGroups.map((g) => (
                  <BatchGroupSection
                    key={g.batchKey}
                    group={g}
                    onOpenSale={handleOpenSale}
                  />
                ))}
              </Stack>
            ) : null}

            {data.customerGroups.length > 0 ? (
              <Stack gap={2}>
                {data.batchGroups.length > 0 ? (
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--admin-text-subtle)]">
                    Hors lot
                  </p>
                ) : null}
                {data.customerGroups.map((g) => (
                  <CustomerGroupSection
                    key={g.customerKey}
                    group={g}
                    onOpenSale={handleOpenSale}
                  />
                ))}
              </Stack>
            ) : null}
          </Stack>
        ) : null}
      </Stack>

      <TicketSheet
        saleId={openSaleId}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setOpenSaleId(null);
        }}
        onSaved={refresh}
      />
    </>
  );
}
