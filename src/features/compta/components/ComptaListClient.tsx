"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Receipt } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";
import { ComptaHeader } from "./ComptaHeader";
import { ComptaKpiRow } from "./ComptaKpiRow";
import { CustomerGroupSection } from "./CustomerGroupSection";
import { TicketSheet } from "./TicketSheet";
import type { ComptaListResult, Period } from "@/server/sales/queries";

type ComptaListClientProps = {
  initial: ComptaListResult;
  initialPeriod: Period;
  initialQuery: string;
};

export function ComptaListClient({ initial, initialPeriod, initialQuery }: ComptaListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ComptaListResult>(initial);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [query, setQuery] = useState<string>(initialQuery);
  const [pending, startTransition] = useTransition();
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce-light: update URL on period/query change → server re-fetch via Next.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (period !== "month") params.set("period", period);
    else params.delete("period");
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
  }, [period, query]);

  // Keep latest server-rendered data in sync (when searchParams change → page re-renders).
  useEffect(() => {
    setData(initial);
  }, [initial]);

  const refresh = useMemo(
    () => async () => {
      setRefreshing(true);
      try {
        const params = new URLSearchParams();
        params.set("period", period);
        if (query.trim()) params.set("q", query.trim());
        const r = await fetch(`/api/admin/compta?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (r.ok) {
          const next = (await r.json()) as ComptaListResult;
          setData(next);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [period, query],
  );

  const handleOpenSale = (saleId: string) => {
    setOpenSaleId(saleId);
    setSheetOpen(true);
  };

  const showLoadingState = pending || refreshing;

  return (
    <>
      <Stack gap={4}>
        <ComptaHeader query={query} onQueryChange={setQuery} period={period} onPeriodChange={setPeriod} />
        <ComptaKpiRow summary={data.summary} />

        {data.groups.length === 0 ? (
          showLoadingState ? (
            <SkeletonList count={4} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="Aucune vente"
              description={
                query.trim().length > 0
                  ? `Rien ne correspond à « ${query.trim()} ».`
                  : "Pas encore de ventes sur cette période."
              }
            />
          )
        ) : (
          <Stack gap={3}>
            {showLoadingState ? <Skeleton height={2} /> : null}
            {data.groups.map((g) => (
              <CustomerGroupSection key={g.customerKey} group={g} onOpenSale={handleOpenSale} />
            ))}
          </Stack>
        )}
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
