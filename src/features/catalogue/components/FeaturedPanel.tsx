"use client";

import Image from "next/image";
import { Loader2, Star, X } from "lucide-react";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { WindowedList } from "@/ui/primitives/WindowedList";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { cn } from "@/lib/utils";
import { FEATURED_LIMIT, type AdminPerfumeRow } from "../types";

type FeaturedPanelProps = {
  featured: readonly AdminPerfumeRow[];
  candidates: readonly AdminPerfumeRow[];
  canEdit: boolean;
  pendingIds: ReadonlySet<number>;
  onToggle: (perfume: AdminPerfumeRow, nextFeatured: boolean) => void;
};

function Thumb({ perfume, size }: { perfume: AdminPerfumeRow; size: number }) {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]"
      style={{ width: size, height: size, border: "1px solid var(--admin-border)" }}
    >
      {perfume.image ? (
        <Image
          loader={nureaAdminThumbLoader}
          src={perfume.image}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          quality={60}
          fetchPriority="low"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[14px] font-bold text-[var(--admin-text-subtle)]">
          {perfume.name[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}

/**
 * Gestion des parfums mis en avant sur la page d'accueil vitrine.
 *
 * Deux emplacements matérialisés, remplis ou vides : l'ancienne version
 * affichait un compteur « 0/2 » puis une grille de tout le catalogue, sans
 * qu'on voie combien de places restaient ni pourquoi les cartes devenaient
 * inertes une fois la limite atteinte.
 */
export function FeaturedPanel({
  featured,
  candidates,
  canEdit,
  pendingIds,
  onToggle,
}: FeaturedPanelProps) {
  const slots = Array.from({ length: FEATURED_LIMIT }, (_, i) => featured[i] ?? null);
  const isFull = featured.length >= FEATURED_LIMIT;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Parfums mis en avant">
        <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
          Sur l&apos;accueil du site · {featured.length}/{FEATURED_LIMIT}
        </h2>
        {/* Une colonne : à 375 px, deux emplacements côte à côte rognaient les
            noms de parfum au troisième caractère (« Afterno… »). */}
        <div className="flex flex-col gap-2">
          {slots.map((perfume, i) =>
            perfume ? (
              <div
                key={perfume.id}
                className="flex items-center gap-2 rounded-[14px] bg-[var(--admin-surface)] p-2 shadow-[var(--admin-shadow-sm)]"
                style={{ border: "1px solid var(--admin-accent)" }}
              >
                <Thumb perfume={perfume} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold leading-tight text-[var(--admin-text)]">
                    {perfume.name}
                  </span>
                  <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
                    {perfume.brand.name}
                  </span>
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    disabled={pendingIds.has(perfume.id)}
                    onClick={() => onToggle(perfume, false)}
                    aria-label={`Retirer ${perfume.name} de la mise en avant`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--admin-text-subtle)] tap-scale hover:bg-[var(--admin-surface-muted)] disabled:opacity-50"
                  >
                    {pendingIds.has(perfume.id) ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden />
                    ) : (
                      <X size={15} aria-hidden />
                    )}
                  </button>
                ) : null}
              </div>
            ) : (
              <div
                key={`slot-${i}`}
                className="flex min-h-[56px] items-center justify-center gap-2 rounded-[14px] px-3"
                style={{ border: "1.5px dashed var(--admin-border-strong)" }}
              >
                <Star size={15} className="text-[var(--admin-text-subtle)]" aria-hidden />
                <span className="text-[13px] text-[var(--admin-text-subtle)]">
                  Emplacement libre
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section aria-label="Parfums à mettre en avant">
        <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
          {isFull ? "Retire un parfum pour en ajouter un autre" : "Choisir un parfum"}
        </h2>
        {candidates.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Aucun parfum"
            description="Ajuste la recherche pour trouver un parfum à mettre en avant."
          />
        ) : (
          <WindowedList
            items={candidates}
            itemKey={(p) => p.id}
            estimateSize={60}
            gap={8}
            aria-label="Parfums disponibles"
            renderItem={(perfume) => {
              const pending = pendingIds.has(perfume.id);
              const disabled = !canEdit || isFull || pending;
              return (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(perfume, true)}
                  aria-label={`Mettre ${perfume.name} en avant`}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 rounded-[14px] bg-[var(--admin-surface)] p-2 text-left",
                    "shadow-[var(--admin-shadow-sm)] admin-card-press",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent-ring)]",
                    disabled ? "opacity-45" : null,
                  )}
                  style={{ border: "1px solid var(--admin-border)" }}
                >
                  <Thumb perfume={perfume} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold leading-tight text-[var(--admin-text)]">
                      {perfume.name}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
                      {perfume.brand.name}
                    </span>
                  </span>
                  {pending ? (
                    <Loader2
                      size={17}
                      className="mr-1.5 shrink-0 animate-spin text-[var(--admin-accent)]"
                      aria-hidden
                    />
                  ) : (
                    <Star
                      size={17}
                      className="mr-1.5 shrink-0 text-[var(--admin-accent)]"
                      aria-hidden
                    />
                  )}
                </button>
              );
            }}
          />
        )}
      </section>
    </div>
  );
}
