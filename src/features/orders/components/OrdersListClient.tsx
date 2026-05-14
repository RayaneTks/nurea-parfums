"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Heading } from "@/ui/primitives/Heading";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { FAB } from "@/ui/primitives/FAB";
import { OrdersGroup } from "./OrdersGroup";
import type { OrdersFilter, OrdersListResult } from "@/server/orders/queries";

const FILTER_OPTIONS = [
  { value: "all" as const, label: "Tout" },
  { value: "pending" as const, label: "En attente" },
  { value: "ready" as const, label: "À traiter" },
  { value: "delivered" as const, label: "Livrées" },
];

type OrdersListClientProps = {
  initial: OrdersListResult;
  initialFilter: OrdersFilter;
};

export function OrdersListClient({ initial, initialFilter }: OrdersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<OrdersFilter>(initialFilter);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (filter !== "all") params.set("filter", filter);
    else params.delete("filter");
    const next = params.toString();
    if (next === searchParams.toString()) return;
    startTransition(() => {
      router.replace(`/admin/ordres${next ? `?${next}` : ""}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const isEmpty = initial.groups.length === 0;

  return (
    <>
      <Stack gap={4}>
        <header>
          <Heading level={1}>Commandes</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)] tabular-nums">
            {initial.counts.pending} en attente · {initial.counts.ready} à traiter
            {initial.counts.overdue > 0 ? (
              <span className="text-[var(--admin-danger)] font-medium">
                {" "}· {initial.counts.overdue} en retard
              </span>
            ) : null}
          </p>
        </header>
        <SegmentedControl
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filtrer commandes"
        />
        {isEmpty ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucune commande"
            description={
              filter === "all"
                ? "Crée ta première commande pour commencer."
                : "Aucune commande dans cette catégorie."
            }
          />
        ) : (
          <Stack gap={4}>
            {initial.groups.map((g) => (
              <OrdersGroup key={g.label} label={g.label} rows={g.rows} />
            ))}
          </Stack>
        )}
      </Stack>

      <FAB icon={Plus} ariaLabel="Nouvelle commande" href="/admin/ordres/new?mode=quick" />
    </>
  );
}
