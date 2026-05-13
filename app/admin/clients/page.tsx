import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PlusCircle, UserRound } from "lucide-react";
import { listCustomers } from "@/server/customers/queries";
import { SectionCard } from "@/components/admin/ui/SectionCard";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { AdminButton } from "@/components/admin/ui/AdminButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clients — Admin",
};

type SearchParams = Promise<{ q?: string; cursor?: string }>;

export default async function ClientsListPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, cursor } = await searchParams;
  const { rows, nextCursor } = await listCustomers({ q, cursor, limit: 50 });

  return (
    <main id="main-content" className="flex-1 space-y-5 px-5 pb-4 pt-2">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900">
            Clients
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {rows.length} {rows.length > 1 ? "clients" : "client"}
            {q ? ` pour « ${q} »` : ""}
          </p>
        </div>
        <Link href="/admin/clients/new" prefetch>
          <AdminButton variant="primary" size="sm">
            <PlusCircle size={16} aria-hidden /> Nouveau
          </AdminButton>
        </Link>
      </header>

      <form className="flex gap-2" action="/admin/clients">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Nom, téléphone, snap…"
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-nurea-bordeaux/40"
        />
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Aucun client"
          description={q ? "Rien ne correspond." : "Crée ton premier client."}
        />
      ) : (
        <SectionCard>
          <ul className="-mx-2 divide-y divide-neutral-100">
            {rows.map((c) => {
              const dueNum = Number(c.outstandingBalance);
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/clients/${c.id}`}
                    prefetch
                    className="group flex items-center gap-3 px-2 py-3 tap-scale active:bg-neutral-50"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nurea-bordeaux/10 text-nurea-bordeaux">
                      <UserRound size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-900">
                        {c.fullName}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        {c.phoneE164 ?? c.snapchat ?? "—"}
                        {c.ordersCount > 0 ? ` · ${c.ordersCount} cmd.` : ""}
                      </span>
                    </span>
                    {dueNum > 0 ? (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {dueNum.toFixed(2)} € dus
                      </span>
                    ) : null}
                    <ArrowRight
                      size={14}
                      className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={`/admin/clients?cursor=${nextCursor}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            prefetch
            className="text-sm font-medium text-nurea-bordeaux hover:underline"
          >
            Charger plus →
          </Link>
        </div>
      ) : null}
    </main>
  );
}
