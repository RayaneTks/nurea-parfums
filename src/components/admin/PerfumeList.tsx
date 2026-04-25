"use client";

import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AdminInput } from "./ui/AdminInput";
import { AdminButton } from "./ui/AdminButton";
import { FilterPills } from "./ui/FilterPills";
import { SectionCard } from "./ui/SectionCard";
import { PerfumeVisual, StatusDot } from "./Visuals";
import { EmptyState } from "./EmptyState";
import type { AdminPerfumeRow } from "@/lib/admin/catalogue-types";

type PerfumeRow = AdminPerfumeRow;

type PerfumeFilter = "all" | "PUBLISHED" | "DRAFT";

interface PerfumeListProps {
  perfumes: PerfumeRow[];
  canEdit: boolean;
  onToggleVisibility: (id: number, currentStatus: string) => void;
  onDelete: (id: number, name: string) => void;
  onPreview: (perfume: PerfumeRow) => void;
  pendingStatusIds: Set<number>;
  pendingDeleteIds: Set<number>;
  hasMutationInFlight: boolean;
  onGoToBrand: (name: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export function PerfumeList({
  perfumes,
  canEdit,
  onToggleVisibility,
  onPreview,
  pendingStatusIds,
  hasMutationInFlight,
  onGoToBrand,
  search,
  onSearchChange,
}: PerfumeListProps) {
  const [filter, setFilter] = useState<PerfumeFilter>("all");

  const filtered = useMemo(() => {
    let rows = perfumes;
    if (filter !== "all") {
      rows = rows.filter((r) => r.status === filter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.brand.name.toLowerCase().includes(q),
    );
  }, [perfumes, search, filter]);

  const grouped = useMemo(() => {
    const byBrand = new Map<string, PerfumeRow[]>();
    for (const row of filtered) {
      const list = byBrand.get(row.brand.name) ?? [];
      list.push(row);
      byBrand.set(row.brand.name, list);
    }
    return [...byBrand.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([brandName, rows]) => ({
        brandName,
        rows: [...rows].sort((a, b) => a.name.localeCompare(b.name, "fr")),
      }));
  }, [filtered]);

  const pillOptions = [
    { value: "all" as const, label: `Tous (${perfumes.length})` },
    {
      value: "PUBLISHED" as const,
      label: `Visibles (${perfumes.filter((p) => p.status === "PUBLISHED").length})`,
    },
    {
      value: "DRAFT" as const,
      label: `Masqués (${perfumes.filter((p) => p.status === "DRAFT").length})`,
    },
  ];

  return (
    <div className="space-y-5 overscroll-y-contain">
      <div className="space-y-3">
        <AdminInput
          isSearch
          placeholder="Rechercher un parfum ou une marque…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={search ? () => onSearchChange("") : undefined}
        />
        <div className="overflow-x-auto no-scrollbar">
          <FilterPills
            options={pillOptions}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filtrer les parfums"
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          title={perfumes.length === 0 ? "Aucun parfum" : "Aucun résultat"}
          description={
            perfumes.length === 0
              ? "Ajoute ton premier parfum pour commencer."
              : "Ajuste les filtres ou la recherche."
          }
          hasSearch={!!search}
          onClearSearch={() => onSearchChange("")}
        />
      ) : (
        <div className="space-y-6 overscroll-y-contain pb-4">
          <h2 className="sr-only">Parfums du catalogue</h2>
          {grouped.map((group) => (
            <section key={group.brandName} className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle">
                  {group.brandName}
                </h3>
                <div className="h-px flex-1 bg-admin-border" />
              </div>

              <div className="flex flex-col gap-2">
                {group.rows.map((row) => (
                  <SectionCard
                    key={row.id}
                    className="flex min-w-0 items-center gap-3 p-3"
                  >
                    <PerfumeVisual
                      name={row.name}
                      image={row.image}
                      imageLight={row.imageLight}
                      onClick={() => onPreview(row)}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[17px] leading-tight tracking-[-0.01em] text-admin-text truncate">
                        {row.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <button
                          type="button"
                          onClick={() => onGoToBrand(row.brand.name)}
                          className="text-[12px] text-admin-muted [@media(hover:hover)]:hover:text-admin-text transition-colors"
                        >
                          {row.brand.name}
                        </button>
                        <span className="text-admin-subtle">·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <StatusDot status={row.status} />
                          <span className="text-[10px] uppercase tracking-wider text-admin-muted">
                            {row.status === "PUBLISHED" ? "Visible" : "Masqué"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/admin/perfumes/${row.id}/edit`}
                        prefetch={false}
                        aria-label={`Éditer ${row.name}`}
                        className="tap-scale inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-admin-border bg-admin-surface text-admin-text shadow-admin-sm transition-[background-color,border-color,color,transform] duration-100 [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:border-admin-border-hover"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Link>

                      {canEdit ? (
                        <AdminButton
                          size="icon"
                          variant="secondary"
                          aria-label={row.status === "PUBLISHED" ? "Masquer" : "Publier"}
                          disabled={hasMutationInFlight || pendingStatusIds.has(row.id)}
                          onClick={() => onToggleVisibility(row.id, row.status)}
                        >
                          {row.status === "PUBLISHED" ? (
                            <Eye className="h-4 w-4" aria-hidden />
                          ) : (
                            <EyeOff className="h-4 w-4" aria-hidden />
                          )}
                        </AdminButton>
                      ) : null}
                    </div>
                  </SectionCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
