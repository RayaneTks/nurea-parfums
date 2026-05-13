"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { AdminPickerListSkeleton } from "../ui/AdminLoadingPrimitives";
import { Modal } from "../ui/Modal";
import { AdminInput } from "../ui/AdminInput";
import { cn } from "@/lib/utils";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import type { PerfumePickerRow } from "@/lib/gestion/types";

let pickerCache: PerfumePickerRow[] | null = null;

interface PerfumePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (perfume: PerfumePickerRow) => void;
  excludedIds?: number[];
  requirePublished?: boolean;
}

export function PerfumePicker({
  open,
  onClose,
  onSelect,
  excludedIds = [],
  requirePublished = false,
}: PerfumePickerProps) {
  const [perfumes, setPerfumes] = useState<PerfumePickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    if (pickerCache) {
      setPerfumes(pickerCache);
      return;
    }
    setLoading(true);
    setError(null);
    fetch("/api/admin/catalogue?mode=picker", { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Impossible de charger le catalogue.");
        return (await r.json()) as { perfumes: PerfumePickerRow[] };
      })
      .then((data) => {
        const nextPerfumes = data.perfumes ?? [];
        setPerfumes(nextPerfumes);
        pickerCache = nextPerfumes;
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    let rows = perfumes;
    if (requirePublished) {
      rows = rows.filter((p) => p.status === "PUBLISHED");
    }
    if (excludedIds.length > 0) {
      const excl = new Set(excludedIds);
      rows = rows.filter((p) => !excl.has(p.id));
    }
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.name.toLowerCase().includes(q),
    );
  }, [perfumes, query, excludedIds, requirePublished]);

  return (
    <Modal open={open} onClose={onClose} title="Choisir un parfum" size="md">
      <div className="space-y-4">
        <AdminInput
          isSearch
          placeholder="Rechercher par nom ou marque…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={query ? () => setQuery("") : undefined}
          autoFocus
        />

        {error ? (
          <p className="text-[13px] text-admin-danger">{error}</p>
        ) : loading ? (
          <AdminPickerListSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-admin-subtle text-center py-10">
            {query ? "Aucun parfum ne correspond." : "Aucun parfum disponible."}
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[60dvh] overflow-y-auto overscroll-y-contain custom-scrollbar -mx-1 px-1 [-webkit-overflow-scrolling:touch]">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                className={cn(
                  "group flex items-center gap-3 p-3 text-left rounded-xl border border-admin-border bg-admin-surface",
                  "transition-colors duration-200 tap-scale",
                  "[@media(hover:hover)]:hover:border-admin-border-hover [@media(hover:hover)]:hover:bg-admin-surface-hover",
                )}
              >
                <div className="relative h-14 w-11 rounded-xl overflow-hidden bg-admin-bg border border-admin-border shrink-0">
                  <Image
                    loader={nureaAdminThumbLoader}
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="44px"
                    quality={60}
                    fetchPriority="low"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[15px] leading-tight tracking-[-0.01em] text-admin-text truncate">
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wider text-admin-subtle truncate">
                    {p.brand.name}
                    {p.status !== "PUBLISHED" ? " · masqué" : ""}
                  </p>
                </div>
                <Check className="h-4 w-4 text-admin-subtle shrink-0 opacity-0 group-hover:opacity-100" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
