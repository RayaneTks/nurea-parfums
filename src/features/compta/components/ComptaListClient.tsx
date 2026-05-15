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
import { BatchGroupSection } from "./BatchGroupSection";
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

  const refresh = useMemo(
    () => async () => {
      setRefreshing(true);
      try {
        const params = new URLSearchParams();
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
    [query],
  );

  const handleOpenSale = (saleId: string) => {
    setOpenSaleId(saleId);
    setSheetOpen(true);
  };

  const showLoadingState = pending || refreshing;
  const hasAny =
    data.batchGroups.length > 0 || data.customerGroups.length > 0;

  return (
    <>
      <Stack gap={4}>
        <ComptaHeader query={query} onQueryChange={setQuery} />
        <ComptaKpiRow summary={data.summary} />

        {!hasAny ? (
          showLoadingState ? (
            <SkeletonList count={4} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="Aucune vente"
              description={
                query.trim().length > 0
                  ? `Rien ne correspond à « ${query.trim()} ».`
                  : "Pas encore de ventes enregistrées."
              }
            />
          )
        ) : (
          <Stack gap={3}>
            {showLoadingState ? <Skeleton height={2} /> : null}

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
