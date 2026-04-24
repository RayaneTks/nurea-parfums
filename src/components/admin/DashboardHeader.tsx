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
          <h1 className="font-[family-name:var(--font-serif)] text-[26px] font-normal leading-tight tracking-tight text-[var(--admin-text)] sm:text-[30px]">
            Catalogue
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {isLoading ? (
              <div className="h-4 w-36 animate-pulse bg-[var(--admin-elevated)]" />
            ) : (
              <p className="text-[13px] font-medium text-[var(--admin-muted)]">
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

      <div className="flex border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1">
        <button
          type="button"
          onClick={() => onTabChange("perfumes")}
          className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)] ${
            activeTab === "perfumes"
              ? "bg-[var(--admin-elevated)] text-[var(--admin-text)]"
              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
          }`}
        >
          Parfums
          {isLoading ? (
            <div className="h-4 w-6 animate-pulse bg-[var(--admin-border)]" />
          ) : (
            <span
              className={`text-[11px] px-1.5 py-0.5 font-semibold ${
                activeTab === "perfumes"
                  ? "bg-[rgba(139,58,58,0.12)] text-[var(--admin-accent-solid)]"
                  : "bg-[var(--admin-elevated)] text-[var(--admin-muted)]"
              }`}
            >
              {perfumeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("brands")}
          className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)] ${
            activeTab === "brands"
              ? "bg-[var(--admin-elevated)] text-[var(--admin-text)]"
              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
          }`}
        >
          Marques
          {isLoading ? (
            <div className="h-4 w-6 animate-pulse bg-[var(--admin-border)]" />
          ) : (
            <span
              className={`text-[11px] px-1.5 py-0.5 font-semibold ${
                activeTab === "brands"
                  ? "bg-[rgba(139,58,58,0.12)] text-[var(--admin-accent-solid)]"
                  : "bg-[var(--admin-elevated)] text-[var(--admin-muted)]"
              }`}
            >
              {brandCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("featured")}
          className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)] ${
            activeTab === "featured"
              ? "bg-[var(--admin-elevated)] text-[var(--admin-text)]"
              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
          }`}
        >
          Mise en avant
        </button>
      </div>
    </div>
  );
}
