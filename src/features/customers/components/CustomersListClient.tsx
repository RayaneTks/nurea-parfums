"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Heading } from "@/ui/primitives/Heading";
import { SearchField } from "@/ui/primitives/SearchField";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Card } from "@/ui/primitives/Card";
import { FAB } from "@/ui/primitives/FAB";
import { CustomerListRow } from "./CustomerListRow";
import type { CustomerListRow as Row } from "@/server/customers/queries";

type CustomersListClientProps = {
  initial: Row[];
  initialQuery: string;
  nextCursor: string | null;
};

function letterOf(name: string): string {
  const s = name.trim().toUpperCase();
  const c = s.charAt(0);
  return /[A-Z]/.test(c) ? c : "#";
}

export function CustomersListClient({ initial, initialQuery, nextCursor }: CustomersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    const next = params.toString();
    if (next === searchParams.toString()) return;
    const t = setTimeout(() => {
      startTransition(() => {
        router.replace(`/admin/clients${next ? `?${next}` : ""}`, { scroll: false });
      });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const sections = useMemo(() => {
    const sorted = [...initial].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "fr", { sensitivity: "base" }),
    );
    const map = new Map<string, Row[]>();
    for (const c of sorted) {
      const k = letterOf(c.fullName);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [initial]);

  return (
    <>
      <Stack gap={4}>
        <header>
          <Heading level={1}>Clients</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)] tabular-nums">
            {initial.length} client{initial.length > 1 ? "s" : ""}
            {query.trim() ? ` pour « ${query.trim()} »` : ""}
          </p>
        </header>

        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Nom, téléphone, snap…"
        />

        {initial.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun client"
            description={
              query.trim()
                ? "Aucun résultat pour cette recherche."
                : "Crée ton premier client pour commencer."
            }
          />
        ) : (
          <Stack gap={3}>
            {sections.map(([letter, rows]) => (
              <section key={letter}>
                <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
                  {letter}
                </h3>
                <Card padding={0} elevated>
                  <ul
                    className="divide-y px-2 py-1"
                    style={{ borderColor: "var(--admin-border)" }}
                  >
                    {rows.map((c) => (
                      <li key={c.id}>
                        <CustomerListRow customer={c} />
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </Stack>
        )}

        {nextCursor ? (
          <div className="flex justify-center pt-2">
            <Link
              href={`/admin/clients?cursor=${nextCursor}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`}
              prefetch
              className="text-[14px] font-medium text-[var(--admin-accent)] hover:underline"
            >
              Charger plus →
            </Link>
          </div>
        ) : null}
      </Stack>

      <FAB icon={Plus} ariaLabel="Nouveau client" href="/admin/clients/new" />
    </>
  );
}
