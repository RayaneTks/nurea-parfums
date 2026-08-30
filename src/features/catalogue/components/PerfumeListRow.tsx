"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { stockStatus } from "@/domain/stock";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { cn } from "@/lib/utils";
import type { AdminPerfumeRow } from "../types";

type PerfumeListRowProps = {
  perfume: AdminPerfumeRow;
  canEdit: boolean;
  pending: boolean;
  /** True si au moins une référence du catalogue suit un stock. */
  stockTracked: boolean;
  onToggleVisibility: () => void;
};

/**
 * Ligne de la liste des parfums.
 *
 * La ligne entière ouvre la fiche : l'ancienne version exposait deux boutons
 * carrés (« fiche » et « visibilité ») aux icônes peu explicites, sans que la
 * ligne elle-même soit cliquable. Ne reste qu'une action secondaire, la
 * bascule de visibilité, à droite.
 *
 * Le statut n'est affiché que lorsqu'il est ANORMAL : marquer « visible » sur
 * 99 lignes sur 99 n'apprend rien et noie le seul cas qui compte, le masqué.
 */
export function PerfumeListRow({
  perfume,
  canEdit,
  pending,
  stockTracked,
  onToggleVisibility,
}: PerfumeListRowProps) {
  const published = perfume.status === "PUBLISHED";
  const stock = typeof perfume.stock === "number" ? stockStatus(perfume.stock) : null;
  const showStock = stockTracked && stock !== null && stock !== "ok";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-[14px] bg-[var(--admin-surface)] pr-1.5",
        "shadow-[var(--admin-shadow-sm)]",
      )}
      style={{ border: "1px solid var(--admin-border)" }}
    >
      <Link
        href={`/admin/perfumes/${perfume.id}/edit`}
        prefetch={false}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-l-[14px] py-2 pl-2 admin-card-press",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent-ring)]",
        )}
      >
        <span
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-muted)]"
          style={{ border: "1px solid var(--admin-border)" }}
        >
          {perfume.image ? (
            <Image
              loader={nureaAdminThumbLoader}
              src={perfume.image}
              alt=""
              width={44}
              height={44}
              sizes="44px"
              quality={60}
              fetchPriority="low"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[15px] font-bold text-[var(--admin-text-subtle)]">
              {perfume.name[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[15px] font-semibold leading-tight",
              published ? "text-[var(--admin-text)]" : "text-[var(--admin-text-muted)]",
            )}
          >
            {perfume.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="min-w-0 truncate text-[12px] text-[var(--admin-text-subtle)]">
              {perfume.brand.name}
            </span>
            {!published ? (
              <span className="shrink-0 rounded-full bg-[var(--admin-surface-muted)] px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.03em] text-[var(--admin-text-muted)]">
                Masqué
              </span>
            ) : null}
            {showStock ? (
              <span
                className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.03em]"
                style={
                  stock === "out"
                    ? { background: "var(--admin-danger-bg)", color: "var(--admin-danger)" }
                    : { background: "var(--admin-warning-bg)", color: "var(--admin-warning)" }
                }
              >
                {stock === "out" ? "Rupture" : `Stock ${perfume.stock}`}
              </span>
            ) : null}
          </span>
        </span>
      </Link>

      {canEdit ? (
        <button
          type="button"
          disabled={pending}
          onClick={onToggleVisibility}
          aria-label={
            published ? `Masquer ${perfume.name}` : `Rendre ${perfume.name} visible`
          }
          aria-pressed={published}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] tap-scale",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent-ring)]",
            "disabled:opacity-50",
            published
              ? "text-[var(--admin-accent)]"
              : "text-[var(--admin-text-subtle)]",
          )}
        >
          {pending ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : published ? (
            <Eye size={19} aria-hidden />
          ) : (
            <EyeOff size={19} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
