"use client";

import { Plus, RefreshCw } from "lucide-react";
import { HeaderAction } from "./shell/HeaderAction";
import { PageHeader } from "./shell/PageHeader";
import { FilterPills } from "./ui/FilterPills";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  perfumeCount: number;
  brandCount: number;
  featuredCount: number;
  activeTab: "perfumes" | "brands" | "featured";
  onTabChange: (tab: "perfumes" | "brands" | "featured") => void;
  canEdit: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const tabs: { id: DashboardHeaderProps["activeTab"]; label: string }[] = [
  { id: "perfumes", label: "Parfums" },
  { id: "brands", label: "Marques" },
  { id: "featured", label: "Mise en avant" },
];

export function DashboardHeader({
  perfumeCount,
  brandCount,
  featuredCount,
  activeTab,
  onTabChange,
  canEdit,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps) {
  const countsByTab: Record<string, number | null> = {
    perfumes: perfumeCount,
    brands: brandCount,
    featured: featuredCount,
  };

  const addHref =
    activeTab === "perfumes"
      ? "/admin/perfumes/new"
      : activeTab === "brands"
        ? "/admin/brands/new"
        : null;

  return (
    <>
      <PageHeader
        title="Catalogue"
        eyebrow="Nuréa Admin"
        signature
        description={
          isLoading
            ? "Chargement…"
            : `${perfumeCount} parfum${perfumeCount > 1 ? "s" : ""} · ${brandCount} marque${brandCount > 1 ? "s" : ""}`
        }
        action={
          <div className="flex shrink-0 items-center gap-1.5">
            {onRefresh ? (
              <HeaderAction
                label="Actualiser le catalogue"
                tone="default"
                disabled={isLoading || isRefreshing}
                onClick={() => onRefresh()}
                className={cn(isRefreshing && "pointer-events-none opacity-70")}
              >
                <RefreshCw
                  className={cn("h-[18px] w-[18px]", isRefreshing && "animate-spin")}
                  aria-hidden
                />
              </HeaderAction>
            ) : null}
            {canEdit && addHref ? (
              <HeaderAction
                href={addHref}
                icon={Plus}
                label={activeTab === "perfumes" ? "Ajouter un parfum" : "Ajouter une marque"}
                tone="accent"
              />
            ) : null}
          </div>
        }
      />
      <div className="admin-nav-no-select px-5 pt-4">
        <FilterPills
          ariaLabel="Sections du catalogue"
          value={activeTab}
          onChange={onTabChange}
          className="w-full justify-start"
          options={tabs.map((tab) => {
            const count = countsByTab[tab.id];
            const label =
              count === null ? tab.label : `${tab.label} ${isLoading ? "—" : count}`;
            return { value: tab.id, label };
          })}
        />
      </div>
    </>
  );
}
