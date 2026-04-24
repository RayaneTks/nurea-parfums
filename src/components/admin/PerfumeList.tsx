"use client";

import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { AdminButton } from "./ui/AdminButton";
import { PerfumeVisual, StatusDot } from "./Visuals";
import { EmptyState } from "./EmptyState";

type PerfumeRow = {
  id: number;
  image: string;
  imageLight: string | null;
  name: string;
  status: string;
  brand: { id: string; name: string; image: string | null; catalogMode: "CURATED" | "COMPLETE"; status: "PUBLISHED" | "DRAFT" };
};

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
  onDelete,
  onPreview,
  pendingStatusIds,
  pendingDeleteIds,
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
      const key = row.brand.name;
      const list = byBrand.get(key) ?? [];
      list.push(row);
      byBrand.set(key, list);
    }
    return [...byBrand.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([brandName, rows]) => ({
        brandName,
        rows: [...rows].sort((a, b) => a.name.localeCompare(b.name, "fr")),
      }));
  }, [filtered]);

  const filterPills: { id: PerfumeFilter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: perfumes.length },
    { id: "PUBLISHED", label: "Visibles", count: perfumes.filter((p) => p.status === "PUBLISHED").length },
    { id: "DRAFT", label: "Masqués", count: perfumes.filter((p) => p.status === "DRAFT").length },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <AdminInput
          isSearch
          placeholder="Rechercher un parfum ou une marque..."
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

      <div className="space-y-6 pb-4">
        {grouped.length === 0 ? (
          <EmptyState
            title={perfumes.length === 0 ? "Aucun parfum" : "Aucun résultat"}
            description={perfumes.length === 0 ? "Commencez par ajouter votre premier parfum au catalogue." : "Essayez d'ajuster vos filtres ou votre recherche."}
            hasSearch={!!search}
            onClearSearch={() => onSearchChange("")}
          />
        ) : (
          grouped.map((group) => (
            <div key={group.brandName} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-[var(--admin-border)]" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                  {group.brandName}
                </h3>
                <div className="h-px flex-1 bg-[var(--admin-border)]" />
              </div>

              <div className="grid gap-3">
                {group.rows.map((row) => (
                  <div
                    key={row.id}
                    className="group relative flex items-center gap-4 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:bg-[var(--admin-elevated)]"
                  >
                    <PerfumeVisual
                      name={row.name}
                      image={row.image}
                      imageLight={row.imageLight}
                      onClick={() => onPreview(row)}
                    />

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-[16px] font-semibold tracking-tight text-[var(--admin-text)] transition-colors group-hover:text-[var(--admin-accent-solid)]">
                        {row.name}
                      </h4>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <button
                          onClick={() => onGoToBrand(row.brand.name)}
                          className="text-[12px] text-[var(--admin-muted)] underline decoration-[var(--admin-border)] underline-offset-4 transition-colors hover:text-[var(--admin-text)] active:opacity-70"
                        >
                          {row.brand.name}
                        </button>
                        <span className="text-[var(--admin-border)]">·</span>
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={row.status} />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                            {row.status === "PUBLISHED" ? "Visible" : "Masqué"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/perfumes/${row.id}/edit`}>
                        <AdminButton size="icon" variant="secondary">
                          <Pencil className="h-4 w-4" />
                        </AdminButton>
                      </Link>
                      
                      {canEdit && (
                        <>
                          <AdminButton
                            size="icon"
                            variant="secondary"
                            className="h-11 w-11"
                            disabled={hasMutationInFlight || pendingStatusIds.has(row.id)}
                            onClick={() => onToggleVisibility(row.id, row.status)}
                          >
                            {row.status === "PUBLISHED" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </AdminButton>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
