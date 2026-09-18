"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { PickerPerfume } from "@/contracts/catalogue";
import type { RecentlySoldDTO } from "@/contracts/documents";
import { eurFromWire, formatEur } from "@/domain/money";
import { cn } from "@/lib/utils";
import { stockBadgeOf } from "@/features/documents/components/line-draft";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Skeleton } from "@/ui/primitives/Skeleton";

/**
 * « Vendus récemment » (N7) dans le composeur : le bloc arrive en streaming (06 E11 « Chargement » : seule la grille
 * a un squelette), le composeur lui fournit par ce contexte de quoi ajouter une ligne et afficher « ×2 ».
 */
export type RecentContextValue = {
  /** Sans ligne : grille 2 × 4 ; avec lignes : bandeau horizontal sous les lignes. */
  lineCount: number;
  quantities: ReadonlyMap<number, number>;
  perfumeOf: (perfumeId: number) => PickerPerfume | undefined;
  add: (item: RecentlySoldDTO) => void;
  /** Les récents lus : S05 les met en tête, une ligne ajoutée reprend leur dernier volume. */
  register: (items: readonly RecentlySoldDTO[]) => void;
};

const RecentContext = createContext<RecentContextValue | null>(null);

export function RecentProvider({ value, children }: { value: RecentContextValue; children: ReactNode }) {
  return <RecentContext.Provider value={value}>{children}</RecentContext.Provider>;
}

function useRecent(): RecentContextValue {
  const ctx = useContext(RecentContext);
  if (!ctx) throw new Error("RecentlySold : hors du composeur.");
  return ctx;
}

/** Tuile ≥ 88 px : vignette, nom, marque, « 80 ml · 120,00 € », un badge au plus, « ×2 » au ticket. */
function Tile({ item, strip }: { item: RecentlySoldDTO; strip: boolean }) {
  const { quantities, perfumeOf, add } = useRecent();
  const count = quantities.get(item.perfumeId);
  const badge = stockBadgeOf(perfumeOf(item.perfumeId));
  const shownBadge = badge && badge.tone !== "warning" ? badge : null;
  const price = `${item.volumeMl ? `${item.volumeMl} ml · ` : ""}${formatEur(eurFromWire(item.unitPriceEur))}`;
  return (
    <button
      type="button"
      data-recent-tile={item.perfumeId}
      onClick={() => add(item)}
      className={cn(
        "tap-scale relative flex min-h-[88px] min-w-0 flex-col gap-1 rounded-[var(--admin-radius-lg)] border p-2.5 text-left",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        count ? "border-[var(--admin-accent)] bg-[var(--admin-accent-bg)]" : "border-[var(--admin-border)] bg-[var(--admin-surface)]",
        strip ? "w-[148px] shrink-0 snap-start" : null,
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <Avatar name={item.name} src={item.image || null} size="sm" />
        {count ? (
          <span className="admin-type-caption tnum font-semibold text-[var(--admin-accent)]">×{count}</span>
        ) : shownBadge ? (
          <Badge tone={shownBadge.tone}>{shownBadge.label}</Badge>
        ) : null}
      </span>
      <span className="admin-type-body block min-w-0 truncate font-medium text-[var(--admin-text)]">{item.name}</span>
      <span className="admin-type-caption block min-w-0 truncate text-[var(--admin-text-muted)]">{item.brandName}</span>
      <span className="admin-type-caption tnum block min-w-0 truncate text-[var(--admin-text-muted)]">{price}</span>
    </button>
  );
}

/** N7 — la grille (sans ligne) ou le bandeau (avec lignes) des 8 parfums vendus récemment. */
export function RecentlySold({ items }: { items: RecentlySoldDTO[] }) {
  const { lineCount, register } = useRecent();
  useEffect(() => register(items), [items, register]);
  // Sans aucun historique de vente : la grille est absente, la recherche seule (06 E11 « Vide »).
  if (items.length === 0) return null;
  if (lineCount === 0) {
    return (
      <section aria-label="Vendus récemment" className="flex flex-col gap-2">
        <h2 className="admin-type-caption px-1 font-semibold text-[var(--admin-text-muted)]">Vendus récemment</h2>
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <Tile key={item.perfumeId} item={item} strip={false} />
          ))}
        </div>
      </section>
    );
  }
  return (
    <section aria-label="Vendus récemment" className="flex flex-col gap-2">
      <h2 className="admin-type-caption px-1 font-semibold text-[var(--admin-text-muted)]">Vendus récemment</h2>
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" data-recent-strip>
        {items.map((item) => (
          <Tile key={item.perfumeId} item={item} strip />
        ))}
      </div>
    </section>
  );
}

/** Squelette aux proportions exactes : 8 tuiles en grille, ou le bandeau quand le ticket a des lignes. */
export function RecentlySoldSkeleton() {
  const ctx = useContext(RecentContext);
  const strip = (ctx?.lineCount ?? 0) > 0;
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <span className="flex h-[18px] items-center px-1">
        <Skeleton width={120} height={12} />
      </span>
      {strip ? (
        <div className="-mx-4 flex gap-2 overflow-hidden px-4 pb-1">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} shape="block" width={148} height={123} className="shrink-0 rounded-[var(--admin-radius-lg)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} shape="block" height={123} className="rounded-[var(--admin-radius-lg)]" />
          ))}
        </div>
      )}
    </div>
  );
}
