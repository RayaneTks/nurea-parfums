"use client";

import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
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
  _count: { perfumes: number };
};

type BrandFilter = "all" | "COMPLETE" | "CURATED" | "DRAFT";

interface BrandListProps {
  brands: BrandRow[];
  canEdit: boolean;
  onToggleVisibility: (id: string, currentStatus: BrandRow["status"]) => void;
  onDelete: (id: string, name: string, count: number) => void;
  onFilterPerfumes: (brandName: string) => void;
  pendingBrandIds: Set<string>;
  hasMutationInFlight: boolean;
}

export function BrandList({
  brands,
  canEdit,
  onToggleVisibility,
  onDelete,
  onFilterPerfumes,
  pendingBrandIds,
  hasMutationInFlight,
}: BrandListProps) {
  const [search, setSearch] = useState("");
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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-3">
        <AdminInput
          isSearch
          placeholder="Rechercher une marque..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
        />
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterPills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilter(pill.id)}
              className={`
                shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200
                ${filter === pill.id 
                  ? "bg-zinc-100 text-zinc-900 shadow-lg shadow-zinc-100/10" 
                  : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"}
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

      <div className="space-y-3 pb-20">
        {filtered.length === 0 ? (
          <EmptyState
            title={brands.length === 0 ? "Aucune marque" : "Aucun résultat"}
            description={brands.length === 0 ? "Ajoutez des marques pour organiser votre catalogue de parfums." : "Essayez d'ajuster vos filtres ou votre recherche."}
            hasSearch={!!search}
            onClearSearch={() => setSearch("")}
          />
        ) : (
          filtered.map((brand) => (
            <div
              key={brand.id}
              className={`
                group relative flex items-center gap-4 p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:bg-zinc-900/80 hover:border-zinc-700 transition-all duration-300
                ${pendingBrandIds.has(brand.id) ? "opacity-50 pointer-events-none" : ""}
              `}
            >
              <BrandVisual name={brand.name} image={brand.image} size={56} />
              
              <div className="min-w-0 flex-1">
                <h4 className="text-[16px] font-bold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                  {brand.name}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <AdminBadge 
                    label={brand.catalogMode === "COMPLETE" ? "Gamme complète" : "Sélection"}
                    variant={brand.catalogMode === "COMPLETE" ? "warning" : "info"}
                  />
                  <div className="flex items-center gap-1.5 ml-0.5">
                    <StatusDot status={brand.status} />
                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
                      {brand.status === "PUBLISHED" ? "Visible" : "Masquée"}
                    </span>
                  </div>
                </div>
                {brand.catalogMode === "CURATED" && (
                  <button
                    onClick={() => onFilterPerfumes(brand.name)}
                    className="mt-2 flex items-center text-[12px] font-medium text-zinc-500 hover:text-blue-400 transition-colors"
                  >
                    <span className="underline underline-offset-4 decoration-zinc-800 group-hover:decoration-blue-400/30">
                      {brand._count.perfumes} parfum{brand._count.perfumes > 1 ? "s" : ""} lié{brand._count.perfumes > 1 ? "s" : ""}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Link href={`/admin/brands/${brand.id}/edit`}>
                  <AdminButton size="icon" variant="secondary" className="h-10 w-10 rounded-xl">
                    <Pencil className="h-4 w-4" />
                  </AdminButton>
                </Link>
                
                {canEdit && (
                  <>
                    <AdminButton
                      size="icon"
                      variant="secondary"
                      className="h-10 w-10 rounded-xl"
                      disabled={hasMutationInFlight || pendingBrandIds.has(brand.id)}
                      onClick={() => onToggleVisibility(brand.id, brand.status)}
                    >
                      {brand.status === "PUBLISHED" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </AdminButton>
                    <AdminButton
                      size="icon"
                      variant="danger"
                      className="h-10 w-10 rounded-xl"
                      disabled={hasMutationInFlight || pendingBrandIds.has(brand.id)}
                      onClick={() => onDelete(brand.id, brand.name, brand._count.perfumes)}
                    >
                      <Trash2 className="h-4 w-4" />
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
