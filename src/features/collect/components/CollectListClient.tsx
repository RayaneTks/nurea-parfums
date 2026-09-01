"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Search } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Heading } from "@/ui/primitives/Heading";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { SearchField } from "@/ui/primitives/SearchField";
import { RelativeTime } from "@/ui/patterns/RelativeTime";
import { CollectSheet } from "./CollectSheet";
import type { OutstandingResult, OutstandingRow } from "@/server/collect/queries";
import { cn } from "@/lib/utils";
import { formateEuros } from "@/ui/patterns/format";

/** Au-delà, une créance est « vieille » et mérite d'être signalée. */
const STALE_DAYS = 30;

function ageInDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Écran « À encaisser ».
 *
 * Il réunit ce que l'app séparait : les ventes non soldées et les commandes
 * partiellement payées. Chaque ligne porte son bouton d'encaissement — c'est
 * l'action, pas un lien vers un écran où il faudra corriger un nombre à la
 * main.
 */
export function CollectListClient({ initial }: { initial: OutstandingResult }) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<OutstandingRow | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial.rows;
    return initial.rows.filter((r) => r.customerName.toLowerCase().includes(q));
  }, [initial.rows, query]);

  const shownTotal = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.due), 0),
    [rows],
  );

  return (
    <>
      <Stack gap={4}>
        <header>
          <Heading level={1}>À encaisser</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)] tabular-nums">
            {initial.rows.length === 0
              ? "Tout est réglé."
              : `${initial.rows.length} créance${initial.rows.length > 1 ? "s" : ""} · ${formateEuros(Number(initial.totalDue), { compact: true })}`}
          </p>
        </header>

        {initial.rows.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Rien à encaisser"
            description="Aucune vente ni commande ne présente de reste dû."
          />
        ) : (
          <>
            {initial.rows.length > 6 ? (
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Rechercher un client…"
              />
            ) : null}

            {rows.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Aucun résultat"
                description={`Personne ne correspond à « ${query.trim()} ».`}
              />
            ) : (
              <Stack gap={2}>
                {rows.map((row) => {
                  const days = ageInDays(row.occurredAt);
                  const stale = days >= STALE_DAYS;
                  const href =
                    row.kind === "order"
                      ? `/admin/ordres/${row.id}`
                      : `/admin/compta?sale=${row.id}`;
                  return (
                    <div
                      key={`${row.kind}-${row.id}`}
                      className="flex items-center gap-3 rounded-[14px] bg-[var(--admin-surface)] p-2.5 shadow-[var(--admin-shadow-sm)]"
                      style={{ border: "1px solid var(--admin-border)" }}
                    >
                      <Link
                        href={href}
                        prefetch={false}
                        className="min-w-0 flex-1 tap-scale"
                      >
                        <span className="block truncate text-[15px] font-semibold leading-tight text-[var(--admin-text)]">
                          {row.customerName}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[var(--admin-text-subtle)]">
                          {row.kind === "sale" ? "Vente" : "Commande"} ·{" "}
                          <RelativeTime date={row.occurredAt} />
                          {stale ? (
                            <span className="font-medium text-[var(--admin-danger)]">
                              {" · "}
                              {days} j
                            </span>
                          ) : null}
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setTarget(row)}
                        aria-label={`Encaisser ${formateEuros(row.due)} de ${row.customerName}`}
                        className={cn(
                          "inline-flex min-h-[var(--admin-touch-min)] shrink-0 items-center gap-1.5 rounded-[12px] px-3",
                          "bg-[var(--admin-accent)] text-white tap-scale",
                          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
                        )}
                      >
                        <span className="tnum text-[15px] font-bold">
                          {formateEuros(Number(row.due), { compact: true })}
                        </span>
                        <ChevronRight size={15} aria-hidden />
                      </button>
                    </div>
                  );
                })}

                {query.trim() && rows.length !== initial.rows.length ? (
                  <p className="px-1 text-[12px] tabular-nums text-[var(--admin-text-subtle)]">
                    {rows.length} affichée{rows.length > 1 ? "s" : ""} ·{" "}
                    {formateEuros(shownTotal, { compact: true })}
                  </p>
                ) : null}
              </Stack>
            )}
          </>
        )}
      </Stack>

      <CollectSheet row={target} onClose={() => setTarget(null)} />
    </>
  );
}
