"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, PackageCheck, Receipt } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { SearchField } from "@/ui/primitives/SearchField";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { Money } from "@/ui/patterns/Money";
import { BatchPicker } from "@/features/compta/components/BatchPicker";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import type { UnbatchedResult, UnbatchedRow } from "@/server/batches/queries";

type UnbatchedSectionProps = {
  data: UnbatchedResult;
  initialQuery: string;
};

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/**
 * Ce qui n'appartient à aucun lot, et le moyen de l'y mettre.
 *
 * L'écran manquant : la fiche d'un lot dit ce qu'il contient, jamais ce qui
 * lui échappe. On rangeait donc de mémoire, et une commande livrée trois
 * semaines plus tôt n'avait plus aucune chance d'être rattachée à l'envoi dont
 * elle faisait partie — avec elle, la part de transport et de douane qui lui
 * revenait restait imputée à personne.
 *
 * Le rattachement se fait ici même, ligne par ligne : ouvrir chaque fiche pour
 * y trouver le même sélecteur, c'était transformer un rangement de dix lignes
 * en dix allers-retours.
 */
export function UnbatchedSection({ data, initialQuery }: UnbatchedSectionProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  /*
   * Une ligne rattachée quitte la liste tout de suite, sans attendre le rendu
   * serveur : sinon elle reste affichée « à ranger » plusieurs centaines de
   * millisecondes après l'avoir rangée, et on la range une seconde fois.
   */
  const [assigned, setAssigned] = useState<Set<string>>(new Set());

  const visible = data.rows.filter((r) => !assigned.has(`${r.kind}:${r.id}`));
  const total = data.counts.orders + data.counts.sales;

  if (total === 0 && query.trim() === "") return null;

  const endpointFor = (row: UnbatchedRow) =>
    row.kind === "order" ? `/api/admin/orders/${row.id}` : `/api/admin/sales/${row.id}`;

  const hrefFor = (row: UnbatchedRow) =>
    row.kind === "order" ? `/admin/ordres/${row.id}` : `/admin/compta?sale=${row.id}`;

  return (
    <>
      <Stack gap={2}>
        <HStack justify="between" align="center" className="px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--admin-text-subtle)]">
            À rattacher ({total})
          </p>
          <span className="text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
            {data.counts.orders} commande{data.counts.orders > 1 ? "s" : ""} ·{" "}
            {data.counts.sales} vente{data.counts.sales > 1 ? "s" : ""}
          </span>
        </HStack>

        {total > 8 || query.trim() !== "" ? (
          <SearchField
            value={query}
            onChange={(next) => {
              setQuery(next);
              const params = new URLSearchParams();
              if (next.trim()) params.set("q", next.trim());
              router.replace(`/admin/lots${params.toString() ? `?${params}` : ""}`, {
                scroll: false,
              });
            }}
            onClear={() => {
              setQuery("");
              router.replace("/admin/lots", { scroll: false });
            }}
            placeholder="Client, parfum, marque…"
            ariaLabel="Chercher parmi les lignes à rattacher"
          />
        ) : null}

        {visible.length === 0 ? (
          <Card padding={3}>
            <p className="text-[13px] text-[var(--admin-text-muted)]">
              {query.trim()
                ? `Rien à rattacher ne correspond à « ${query.trim()} ».`
                : "Tout est rangé."}
            </p>
          </Card>
        ) : (
          <Card padding={0}>
            <ul className="divide-y px-3" style={{ borderColor: "var(--admin-border)" }}>
              {visible.map((row) => (
                <li key={`${row.kind}:${row.id}`} className="py-3">
                  <Stack gap={2}>
                    <Link href={hrefFor(row)} prefetch className="block tap-scale">
                      <HStack justify="between" align="start" gap={3}>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            {row.kind === "order" ? (
                              <PackageCheck size={13} className="shrink-0 text-[var(--admin-text-subtle)]" />
                            ) : (
                              <Receipt size={13} className="shrink-0 text-[var(--admin-text-subtle)]" />
                            )}
                            <span className="truncate text-[15px] font-semibold text-[var(--admin-text)]">
                              {row.customerName}
                            </span>
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {row.status ? <OrderStatusBadge status={row.status} /> : null}
                            <span className="truncate text-[12px] text-[var(--admin-text-subtle)]">
                              {row.summary} · {dateCourte(row.at)}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <Money value={row.total} bold compact className="text-[15px]" />
                          {Number(row.due) > 0.005 ? (
                            <span className="mt-0.5 block text-[11px] text-[var(--admin-warning)]">
                              <Money value={row.due} compact /> dû
                            </span>
                          ) : null}
                        </span>
                      </HStack>
                    </Link>
                    <BatchPicker
                      endpoint={endpointFor(row)}
                      current={null}
                      onAssigned={(next) => {
                        if (!next) return;
                        setAssigned((prev) => new Set(prev).add(`${row.kind}:${row.id}`));
                        setToast({ type: "success", message: `Rattaché à « ${next.name} ».` });
                        router.refresh();
                      }}
                      onError={(message) => setToast({ type: "error", message })}
                    />
                  </Stack>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data.truncated > 0 ? (
          <p className="px-1 text-[11px] text-[var(--admin-text-subtle)]">
            {/* Une troncature muette se lit « tout est là » : elle est dite. */}
            {data.truncated} ligne{data.truncated > 1 ? "s" : ""} plus ancienne
            {data.truncated > 1 ? "s" : ""} non affichée{data.truncated > 1 ? "s" : ""} — affine la
            recherche pour l&apos;atteindre.
          </p>
        ) : null}

        {total === 0 ? null : (
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-[var(--admin-text-subtle)]">
            <Boxes size={12} aria-hidden />
            Les commandes livrées y restent : c&apos;est l&apos;envoi terminé qu&apos;on rattache
            pour lui imputer le transport.
          </p>
        )}
      </Stack>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
