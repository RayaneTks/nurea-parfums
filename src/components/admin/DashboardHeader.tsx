"use client";

import { AdminButton } from "./ui/AdminButton";
import { Plus } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  perfumeCount: number;
  brandCount: number;
  activeTab: "perfumes" | "brands" | "featured";
  onTabChange: (tab: "perfumes" | "brands" | "featured") => void;
  canEdit: boolean;
  isLoading?: boolean;
}

/** En-tête catalogue : titre large style iOS + segmented control. */
export function DashboardHeader({
  perfumeCount,
  brandCount,
  activeTab,
  onTabChange,
  canEdit,
  isLoading = false,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--admin-text)] sm:text-[32px]">
            Catalogue
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {isLoading ? (
              <div className="h-4 w-36 animate-pulse rounded-[6px] bg-[var(--admin-fill)]" />
            ) : (
              <p className="text-[15px] font-normal text-[var(--admin-secondary)]">
                {perfumeCount} parfums · {brandCount} marques
              </p>
            )}
          </div>
        </div>

        {canEdit && activeTab !== "featured" && (
          <div className="hidden shrink-0 sm:block">
            <Link href={activeTab === "perfumes" ? "/admin/perfumes/new" : "/admin/brands/new"}>
              <AdminButton leftIcon={Plus} size="sm">
                Ajouter {activeTab === "perfumes" ? "un parfum" : "une marque"}
              </AdminButton>
            </Link>
          </div>
        )}
      </div>

      <div
        className="flex rounded-[10px] bg-[var(--admin-fill)] p-1"
        role="tablist"
        aria-label="Sections catalogue"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "perfumes"}
          onClick={() => onTabChange("perfumes")}
          className={`relative flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[8px] text-[13px] font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-fill)] ${
            activeTab === "perfumes"
              ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] shadow-sm"
              : "text-[var(--admin-secondary)]"
          }`}
        >
          Parfums
          {isLoading ? (
            <div className="h-3.5 w-5 animate-pulse rounded-[4px] bg-[var(--admin-border)]" />
          ) : (
            <span
              className={`min-w-[1.25rem] text-center text-[12px] font-semibold tabular-nums ${
                activeTab === "perfumes" ? "text-[var(--admin-accent)]" : "text-[var(--admin-tertiary)]"
              }`}
            >
              {perfumeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "brands"}
          onClick={() => onTabChange("brands")}
          className={`relative flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[8px] text-[13px] font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-fill)] ${
            activeTab === "brands"
              ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] shadow-sm"
              : "text-[var(--admin-secondary)]"
          }`}
        >
          Marques
          {isLoading ? (
            <div className="h-3.5 w-5 animate-pulse rounded-[4px] bg-[var(--admin-border)]" />
          ) : (
            <span
              className={`min-w-[1.25rem] text-center text-[12px] font-semibold tabular-nums ${
                activeTab === "brands" ? "text-[var(--admin-accent)]" : "text-[var(--admin-tertiary)]"
              }`}
            >
              {brandCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "featured"}
          onClick={() => onTabChange("featured")}
          className={`relative flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[8px] text-[13px] font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-fill)] ${
            activeTab === "featured"
              ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] shadow-sm"
              : "text-[var(--admin-secondary)]"
          }`}
        >
          Mise en avant
        </button>
      </div>
    </div>
  );
}
