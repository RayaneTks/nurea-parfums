"use client";

import { useMemo } from "react";
import { Star, StarOff, Info } from "lucide-react";
import Image from "next/image";
import { AdminInput } from "./ui/AdminInput";
import { SectionCard } from "./ui/SectionCard";
import { cn } from "@/lib/utils";
import type { AdminPerfumeRow } from "@/lib/admin";

type PerfumeRow = AdminPerfumeRow;

interface FeaturedListProps {
  perfumes: PerfumeRow[];
  canEdit: boolean;
  onToggleFeatured: (id: number, currentFeatured: boolean) => void;
  pendingFeaturedIds: Set<number>;
  search: string;
  onSearchChange: (val: string) => void;
}

export function FeaturedList({
  perfumes,
  canEdit,
  onToggleFeatured,
  pendingFeaturedIds,
  search,
  onSearchChange,
}: FeaturedListProps) {
  const featuredPerfumes = perfumes.filter((p) => p.isFeatured);

  const otherPerfumes = useMemo(() => {
    const rows = perfumes.filter((p) => !p.isFeatured && p.status === "PUBLISHED");
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.name.toLowerCase().includes(q),
    );
  }, [perfumes, search]);

  const canAddMore = featuredPerfumes.length < 2;

  return (
    <div className="space-y-6">
      <div className="flex gap-3 p-4 rounded-xl border border-admin-border bg-admin-accent-subtle">
        <Info className="h-4 w-4 text-admin-accent shrink-0 mt-0.5" aria-hidden />
        <div className="text-[13px] leading-relaxed text-admin-muted">
          <p className="font-medium text-admin-text mb-1">Mise en avant sur l&apos;accueil</p>
          Sélectionne jusqu&apos;à 2 parfums pour la page d&apos;accueil. Seuls les parfums publiés peuvent être mis en avant.
          <p className="mt-2 text-[12px] text-admin-accent font-medium">
            Actuellement : {featuredPerfumes.length} / 2
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-admin-muted px-1">
          <Star className="h-3.5 w-3.5 text-admin-cuivre fill-admin-cuivre" aria-hidden />
          Parfums mis en avant ({featuredPerfumes.length})
        </h2>

        {featuredPerfumes.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-admin-border bg-admin-surface/40">
            <p className="text-[13px] text-admin-muted">Aucun parfum mis en avant.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {featuredPerfumes.map((p) => (
              <FeatureRow
                key={p.id}
                perfume={p}
                isFeatured
                canEdit={canEdit}
                onToggle={() => onToggleFeatured(p.id, true)}
                isPending={pendingFeaturedIds.has(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-admin-muted">
            Autres parfums publiés
          </h2>
        </div>

        <AdminInput
          isSearch
          placeholder="Chercher un parfum…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={search ? () => onSearchChange("") : undefined}
        />

        {otherPerfumes.length === 0 ? (
          <div className="p-10 text-center rounded-xl border border-dashed border-admin-border bg-admin-surface/40">
            <p className="text-[13px] text-admin-muted">Aucun résultat pour cette recherche.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {otherPerfumes.map((p) => (
              <FeatureRow
                key={p.id}
                perfume={p}
                isFeatured={false}
                canEdit={canEdit}
                disabled={!canAddMore}
                onToggle={() => onToggleFeatured(p.id, false)}
                isPending={pendingFeaturedIds.has(p.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FeatureRow({
  perfume,
  isFeatured,
  canEdit,
  disabled,
  onToggle,
  isPending,
}: {
  perfume: PerfumeRow;
  isFeatured: boolean;
  canEdit: boolean;
  disabled?: boolean;
  onToggle: () => void;
  isPending: boolean;
}) {
  return (
    <SectionCard
      tone={isFeatured ? "accent" : "default"}
      className="flex items-center gap-3 p-3"
    >
      <div className="relative h-14 w-11 rounded-xl overflow-hidden bg-admin-bg border border-admin-border shrink-0">
        <Image src={perfume.image} alt={perfume.name} fill className="object-cover" sizes="44px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-[15px] leading-tight tracking-[-0.01em] text-admin-text truncate">
          {perfume.name}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-admin-muted truncate">
          {perfume.brand.name}
        </p>
      </div>
      {canEdit ? (
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || isPending}
          aria-label={
            isFeatured
              ? "Retirer de la mise en avant"
              : disabled
                ? "Limite de 2 atteinte"
                : "Mettre en avant"
          }
          className={cn(
            "shrink-0 h-11 w-11 flex items-center justify-center rounded-xl border",
            "transition-colors duration-200 tap-scale",
            isPending && "opacity-50 cursor-not-allowed",
            isFeatured
              ? "bg-admin-accent-subtle border-admin-border-hover text-admin-accent"
              : disabled
                ? "opacity-40 cursor-not-allowed bg-admin-surface border-admin-border text-admin-subtle"
                : "bg-admin-surface border-admin-border text-admin-muted [@media(hover:hover)]:hover:border-admin-border-hover [@media(hover:hover)]:hover:text-admin-text",
          )}
        >
          {isFeatured ? (
            <StarOff className="h-4 w-4" aria-hidden />
          ) : (
            <Star className="h-4 w-4" aria-hidden />
          )}
        </button>
      ) : null}
    </SectionCard>
  );
}
