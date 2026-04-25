"use client";

import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { AdminButton } from "./ui/AdminButton";
import { FilterPills } from "./ui/FilterPills";
import { SectionCard } from "./ui/SectionCard";
import { BrandVisual, StatusDot } from "./Visuals";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";
import type { AdminBrandRow } from "@/lib/admin/catalogue-types";

type BrandRow = AdminBrandRow;

type BrandFilter = "all" | "COMPLETE" | "CURATED" | "DRAFT";

interface BrandListProps {
  brands: BrandRow[];
  canEdit: boolean;
  onToggleVisibility: (id: string, currentStatus: BrandRow["status"]) => void;
  onDelete: (id: string, name: string, count: number) => void;
  onFilterPerfumes: (brandName: string) => void;
  onPreview: (brand: BrandRow) => void;
  pendingBrandIds: Set<string>;
  hasMutationInFlight: boolean;
  search: string;
  onSearchChange: (val: string) => void;
}

export function BrandList({
  brands,
  canEdit,
  onToggleVisibility,
  onFilterPerfumes,
  onPreview,
  pendingBrandIds,
  hasMutationInFlight,
  search,
  onSearchChange,
}: BrandListProps) {
  const [filter, setFilter] = useState<BrandFilter>("all");

  const filtered = useMemo(() => {
    let rows = brands;
    if (filter === "COMPLETE") rows = rows.filter((b) => b.catalogMode === "COMPLETE");
    if (filter === "CURATED") rows = rows.filter((b) => b.catalogMode === "CURATED");
    if (filter === "DRAFT") rows = rows.filter((b) => b.status === "DRAFT");
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q),
    );
  }, [brands, search, filter]);

  const pillOptions = [
    { value: "all" as const, label: `Toutes (${brands.length})` },
    {
      value: "COMPLETE" as const,
      label: `Gammes (${brands.filter((b) => b.catalogMode === "COMPLETE").length})`,
    },
    {
      value: "CURATED" as const,
      label: `Sélections (${brands.filter((b) => b.catalogMode === "CURATED").length})`,
    },
    {
      value: "DRAFT" as const,
      label: `Masquées (${brands.filter((b) => b.status === "DRAFT").length})`,
    },
  ];

  return (
    <div className="space-y-5 overscroll-y-contain">
      <div className="space-y-3">
        <AdminInput
          isSearch
          placeholder="Rechercher une marque…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={search ? () => onSearchChange("") : undefined}
        />
        <div className="overflow-x-auto no-scrollbar">
          <FilterPills
            options={pillOptions}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filtrer les marques"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={brands.length === 0 ? "Aucune marque" : "Aucun résultat"}
          description={
            brands.length === 0
              ? "Ajoute des marques pour organiser ton catalogue."
              : "Ajuste les filtres ou la recherche."
          }
          hasSearch={!!search}
          onClearSearch={() => onSearchChange("")}
        />
      ) : (
        <div className="flex flex-col gap-2 overscroll-y-contain pb-4">
          <h2 className="sr-only">Marques du catalogue</h2>
          {filtered.map((brand) => (
            <SectionCard
              key={brand.id}
              className={cn(
                "flex min-w-0 items-center gap-3 p-3",
                pendingBrandIds.has(brand.id) && "opacity-50 pointer-events-none",
              )}
            >
              <BrandVisual
                name={brand.name}
                image={brand.image}
                imageLight={brand.imageLight}
                onClick={() => onPreview(brand)}
              />

              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-[17px] leading-tight tracking-[-0.01em] text-admin-text truncate">
                  {brand.name}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <AdminBadge
                    label={brand.catalogMode === "COMPLETE" ? "Gamme complète" : "Sélection"}
                    variant={brand.catalogMode === "COMPLETE" ? "warning" : "info"}
                  />
                  {brand.catalogMode === "CURATED" ? (
                    <button
                      type="button"
                      onClick={() => onFilterPerfumes(brand.name)}
                      className="text-[12px] text-admin-muted [@media(hover:hover)]:hover:text-admin-text transition-colors"
                    >
                      {brand._count.perfumes} parfum{brand._count.perfumes > 1 ? "s" : ""}
                    </button>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot status={brand.status} />
                    <span className="text-[10px] uppercase tracking-wider text-admin-muted">
                      {brand.status === "PUBLISHED" ? "Visible" : "Masquée"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/admin/brands/${brand.id}/edit`}
                  prefetch={false}
                  aria-label={`Éditer ${brand.name}`}
                  className="tap-scale inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-admin-border bg-admin-surface text-admin-text shadow-admin-sm transition-[background-color,border-color,color,transform] duration-100 [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:border-admin-border-hover"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Link>

                {canEdit ? (
                  <AdminButton
                    size="icon"
                    variant="secondary"
                    aria-label={brand.status === "PUBLISHED" ? "Masquer" : "Publier"}
                    disabled={hasMutationInFlight || pendingBrandIds.has(brand.id)}
                    onClick={() => onToggleVisibility(brand.id, brand.status)}
                  >
                    {brand.status === "PUBLISHED" ? (
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
      )}
    </div>
  );
}
