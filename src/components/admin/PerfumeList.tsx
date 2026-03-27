"use client";

import { useMemo, useState } from "react";
import { Pencil, Eye, EyeOff, Trash2 } from "lucide-react";
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
  pendingStatusIds: Set<number>;
  pendingDeleteIds: Set<number>;
  hasMutationInFlight: boolean;
  onGoToBrand: (name: string) => void;
}

export function PerfumeList({
  perfumes,
  canEdit,
  onToggleVisibility,
  onDelete,
  pendingStatusIds,
  pendingDeleteIds,
  hasMutationInFlight,
  onGoToBrand,
}: PerfumeListProps) {
  const [search, setSearch] = useState("");
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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-3">
        <AdminInput
          isSearch
          placeholder="Rechercher un parfum ou une marque..."
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

      <div className="space-y-6 pb-20">
        {grouped.length === 0 ? (
          <EmptyState
            title={perfumes.length === 0 ? "Aucun parfum" : "Aucun résultat"}
            description={perfumes.length === 0 ? "Commencez par ajouter votre premier parfum au catalogue." : "Essayez d'ajuster vos filtres ou votre recherche."}
            hasSearch={!!search}
            onClearSearch={() => setSearch("")}
          />
        ) : (
          grouped.map((group) => (
            <div key={group.brandName} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500">
                  {group.brandName}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-l from-zinc-800 to-transparent" />
              </div>

              <div className="grid gap-3">
                {group.rows.map((row) => (
                  <div
                    key={row.id}
                    className="group relative flex items-center gap-4 p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:bg-zinc-900/80 hover:border-zinc-700 transition-all duration-300"
                  >
                    <PerfumeVisual name={row.name} image={row.image} imageLight={row.imageLight} />
                    
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[15px] font-semibold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                        {row.name}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <button
                          onClick={() => onGoToBrand(row.brand.name)}
                          className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors underline decoration-zinc-800 underline-offset-4"
                        >
                          {row.brand.name}
                        </button>
                        <span className="text-zinc-700">·</span>
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={row.status} />
                          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
                            {row.status === "PUBLISHED" ? "Visible" : "Masqué"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link href={`/admin/perfumes/${row.id}/edit`}>
                        <AdminButton size="icon" variant="secondary" className="h-9 w-9 min-h-0 min-w-0 rounded-lg">
                          <Pencil className="h-3.5 w-3.5" />
                        </AdminButton>
                      </Link>
                      
                      {canEdit && (
                        <>
                          <AdminButton
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9 min-h-0 min-w-0 rounded-lg"
                            disabled={hasMutationInFlight || pendingStatusIds.has(row.id)}
                            onClick={() => onToggleVisibility(row.id, row.status)}
                          >
                            {row.status === "PUBLISHED" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </AdminButton>
                          <AdminButton
                            size="icon"
                            variant="danger"
                            className="h-9 w-9 min-h-0 min-w-0 rounded-lg"
                            disabled={hasMutationInFlight || pendingDeleteIds.has(row.id)}
                            onClick={() => onDelete(row.id, row.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
