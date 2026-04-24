import { useMemo, useState } from "react";
import { Star, StarOff, Info } from "lucide-react";
import Image from "next/image";
import { AdminInput } from "./ui/AdminInput";

type PerfumeRow = {
  id: number;
  name: string;
  image: string;
  imageLight: string | null;
  status: string;
  isFeatured?: boolean;
  brand: { name: string };
};

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
    let rows = perfumes.filter((p) => !p.isFeatured && p.status === "PUBLISHED");
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand.name.toLowerCase().includes(q),
    );
  }, [perfumes, search]);

  const canAddMore = featuredPerfumes.length < 2;

  return (
    <div className="space-y-8">
      <div className="flex gap-3 rounded-[12px] border border-[var(--admin-separator)] bg-[var(--admin-accent-muted)] p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--admin-accent)]" aria-hidden />
        <div className="text-[15px] leading-snug text-[var(--admin-secondary)]">
          <p className="mb-1 font-semibold text-[var(--admin-text)]">Mise en avant sur l&apos;accueil</p>
          Jusqu&apos;à 2 parfums en tête de page. Seuls les parfums visibles sont proposés.
          <span className="mt-2 block font-medium text-[var(--admin-text)]">
            Actuellement : {featuredPerfumes.length} / 2
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--admin-text)]">
          <Star className="h-5 w-5 fill-[#B8860B] text-[#8B6914]" aria-hidden />
          Parfums mis en avant ({featuredPerfumes.length})
        </h3>
        {featuredPerfumes.length === 0 ? (
          <div className="border border-dashed border-[var(--admin-border)] bg-[var(--admin-elevated)]/50 p-8 text-center">
            <p className="text-sm text-[var(--admin-muted)]">Aucun parfum mis en avant.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {featuredPerfumes.map((p) => (
              <PerfumeFeatureCard
                key={p.id}
                perfume={p}
                isFeatured={true}
                canEdit={canEdit}
                onToggle={() => onToggleFeatured(p.id, true)}
                isPending={pendingFeaturedIds.has(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h3 className="text-lg font-semibold text-[var(--admin-text)]">Autres parfums visibles</h3>
          <div className="w-full sm:max-w-xs">
            <AdminInput
              isSearch
              placeholder="Chercher un parfum…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={() => onSearchChange("")}
            />
          </div>
        </div>

        {otherPerfumes.length === 0 ? (
          <div className="border border-dashed border-[var(--admin-border)] bg-[var(--admin-elevated)]/40 p-12 text-center">
            <p className="text-sm text-[var(--admin-muted)]">Aucun résultat pour cette recherche.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherPerfumes.map((p) => (
              <PerfumeFeatureCard
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
      </div>
    </div>
  );
}

function PerfumeFeatureCard({
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
    <div
      className={`flex items-center gap-4 border p-3 transition-colors ${
        isFeatured
          ? "border-[rgba(184,134,11,0.45)] bg-[rgba(184,134,11,0.06)]"
          : "border-[var(--admin-border)] bg-[var(--admin-surface)]"
      }`}
    >
      <div className="relative h-16 w-12 shrink-0 overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-elevated)]">
        <Image src={perfume.image} alt="" fill className="object-cover" sizes="48px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{perfume.name}</p>
        <p className="truncate text-xs text-[var(--admin-muted)]">{perfume.brand.name}</p>
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || isPending}
          title={
            isFeatured ? "Retirer de la mise en avant" : disabled ? "Limite de 2 atteinte" : "Mettre en avant"
          }
          className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
            isPending
              ? "cursor-not-allowed opacity-50"
              : isFeatured
                ? "border-[rgba(184,134,11,0.4)] bg-[rgba(184,134,11,0.12)] text-[#6B5A12]"
                : disabled
                  ? "cursor-not-allowed border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-muted)] opacity-50"
                  : "border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-muted)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)]"
          }`}
        >
          {isFeatured ? <StarOff className="h-5 w-5" /> : <Star className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
