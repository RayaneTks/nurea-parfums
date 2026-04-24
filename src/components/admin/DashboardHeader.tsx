"use client";

import { Plus } from "lucide-react";
import { HeaderAction } from "./shell/HeaderAction";
import { PageHeader } from "./shell/PageHeader";
import { FilterPills } from "./ui/FilterPills";

interface DashboardHeaderProps {
  perfumeCount: number;
  brandCount: number;
  activeTab: "perfumes" | "brands" | "featured";
  onTabChange: (tab: "perfumes" | "brands" | "featured") => void;
  canEdit: boolean;
  isLoading?: boolean;
}

const tabs: { id: DashboardHeaderProps["activeTab"]; label: string }[] = [
  { id: "perfumes", label: "Parfums" },
  { id: "brands", label: "Marques" },
  { id: "featured", label: "Mise en avant" },
];

export function DashboardHeader({
  perfumeCount,
  brandCount,
  activeTab,
  onTabChange,
  canEdit,
  isLoading = false,
}: DashboardHeaderProps) {
  const countsByTab: Record<string, number | null> = {
    perfumes: perfumeCount,
    brands: brandCount,
    featured: null,
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
          canEdit && addHref ? (
            <HeaderAction
              href={addHref}
              icon={Plus}
              label={activeTab === "perfumes" ? "Ajouter un parfum" : "Ajouter une marque"}
              tone="accent"
            />
          ) : null
        }
      />
      <div className="px-5 pt-4">
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
