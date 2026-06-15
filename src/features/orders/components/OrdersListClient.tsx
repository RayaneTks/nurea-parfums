"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Heading } from "@/ui/primitives/Heading";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Button } from "@/ui/primitives/Button";
import { FAB } from "@/ui/primitives/FAB";
import { OrdersGroup } from "./OrdersGroup";
import type { OrdersFilter, OrdersListResult } from "@/server/orders/queries";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS = [
  { value: "all" as const, label: "Tout" },
  { value: "pending" as const, label: "En attente" },
  { value: "ready" as const, label: "À traiter" },
  { value: "delivered" as const, label: "Livrées" },
];

const EMPTY_COPY: Record<
  OrdersFilter,
  { title: string; description: string; showAction: boolean }
> = {
  all: {
    title: "Aucune commande",
    description: "Crée ta première commande pour commencer le suivi.",
    showAction: true,
  },
  pending: {
    title: "Rien en attente",
    description: "Aucune commande en attente de paiement ou d'acompte.",
    showAction: false,
  },
  ready: {
    title: "Rien à traiter",
    description: "Aucune commande prête à préparer ou à livrer.",
    showAction: false,
  },
  delivered: {
    title: "Aucune livraison",
    description: "Les commandes finalisées apparaîtront ici.",
    showAction: false,
  },
};

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
  const empty = EMPTY_COPY[filter];

  return (
    <>
      <Stack gap={4}>
        <header>
          <Heading level={1}>Commandes</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)] tabular-nums">
            {initial.counts.pending} en attente · {initial.counts.ready} à traiter
            {initial.counts.overdue > 0 ? (
              <span className="font-medium text-[var(--admin-danger)]">
                {" "}
                · {initial.counts.overdue} en retard
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
            title={empty.title}
            description={empty.description}
            action={
              empty.showAction ? (
                <Link href="/admin/ordres/new?mode=quick">
                  <Button variant="primary" size="md" leadingIcon={<Plus size={16} />}>
                    Créer une commande
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Stack
            gap={4}
            className={cn(
              "transition-opacity duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
              pending ? "opacity-60" : "opacity-100",
            )}
            aria-busy={pending}
          >
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
