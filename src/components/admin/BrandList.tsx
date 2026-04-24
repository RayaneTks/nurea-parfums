"use client";

import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { AdminButton } from "./ui/AdminButton";
import { BrandVisual, StatusDot } from "./Visuals";
import { EmptyState } from "./EmptyState";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
  imageLight: string | null;
  _count: { perfumes: number };
};

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
  onDelete,
  onFilterPerfumes,
  onPreview,
  pendingBrandIds,
  hasMutationInFlight,
  search,
  onSearchChange,
}: BrandListProps) {
  const [filter, setFilter] = useState<BrandFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = brands;
    if (filter === "COMPLETE") rows = rows.filter((b) => b.catalogMode === "COMPLETE");
    if (filter === "CURATED") rows = rows.filter((b) => b.catalogMode === "CURATED");
    if (filter === "DRAFT") rows = rows.filter((b) => b.status === "DRAFT");
    if (q) {
      return rows.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [brands, search, filter]);

  const filterPills: { id: BrandFilter; label: string; count: number }[] = [
    { id: "all", label: "Toutes", count: brands.length },
    { id: "COMPLETE", label: "Gammes", count: brands.filter((b) => b.catalogMode === "COMPLETE").length },
    { id: "CURATED", label: "Sélections", count: brands.filter((b) => b.catalogMode === "CURATED").length },
    { id: "DRAFT", label: "Masquées", count: brands.filter((b) => b.status === "DRAFT").length },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <AdminInput
          isSearch
          placeholder="Rechercher une marque..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange("")}
        />
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterPills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilter(pill.id)}
              className={`
                shrink-0 min-h-[40px] px-4 py-2 text-[13px] font-semibold transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${filter === pill.id 
                  ? "border border-[var(--admin-accent)] bg-[rgba(139,58,58,0.08)] text-[var(--admin-text)]" 
                  : "border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"}
              `}
            >
              {pill.label}
              <span className={`ml-1.5 opacity-50 ${filter === pill.id ? "text-zinc-500" : ""}`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 pb-4">
        {filtered.length === 0 ? (
          <EmptyState
            title={brands.length === 0 ? "Aucune marque" : "Aucun résultat"}
            description={brands.length === 0 ? "Ajoutez des marques pour organiser votre catalogue de parfums." : "Essayez d'ajuster vos filtres ou votre recherche."}
            hasSearch={!!search}
            onClearSearch={() => onSearchChange("")}
          />
        ) : (
          filtered.map((brand) => (
            <div
              key={brand.id}
              className={`
                group relative flex items-center gap-4 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:bg-[var(--admin-elevated)]
                ${pendingBrandIds.has(brand.id) ? "pointer-events-none opacity-50" : ""}
              `}
            >
              <BrandVisual
                name={brand.name}
                image={brand.image}
                imageLight={brand.imageLight}
                onClick={() => onPreview(brand)}
              />              
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-[16px] font-semibold tracking-tight text-[var(--admin-text)] transition-colors group-hover:text-[var(--admin-accent-solid)]">
                  {brand.name}
                </h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <AdminBadge 
                    label={brand.catalogMode === "COMPLETE" ? "Gamme complète" : "Sélection"}
                    variant={brand.catalogMode === "COMPLETE" ? "warning" : "info"}
                  />
                  {brand.catalogMode === "CURATED" && (
                    <button
                      onClick={() => onFilterPerfumes(brand.name)}
                      className="text-[12px] text-[var(--admin-muted)] underline decoration-[var(--admin-border)] underline-offset-4 transition-colors hover:text-[var(--admin-text)] active:opacity-70"
                    >
                      {brand._count.perfumes} parfum{brand._count.perfumes > 1 ? "s" : ""}
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 ml-0.5">
                    <StatusDot status={brand.status} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                      {brand.status === "PUBLISHED" ? "Visible" : "Masquée"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Link href={`/admin/brands/${brand.id}/edit`}>
                  <AdminButton size="icon" variant="secondary" className="h-11 w-11">
                    <Pencil className="h-4 w-4" />
                  </AdminButton>
                </Link>
                
                {canEdit && (
                  <>
                    <AdminButton
                      size="icon"
                      variant="secondary"
                      className="h-11 w-11"
                      disabled={hasMutationInFlight || pendingBrandIds.has(brand.id)}
                      onClick={() => onToggleVisibility(brand.id, brand.status)}
                    >
                      {brand.status === "PUBLISHED" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </AdminButton>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
