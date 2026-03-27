"use client";

import { AdminButton } from "./ui/AdminButton";
import { Plus } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  perfumeCount: number;
  brandCount: number;
  activeTab: "perfumes" | "brands";
  onTabChange: (tab: "perfumes" | "brands") => void;
  canEdit: boolean;
}

export function DashboardHeader({
  perfumeCount,
  brandCount,
  activeTab,
  onTabChange,
  canEdit,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-100">
            Catalogue
          </h1>
          <p className="mt-1 text-[13px] font-medium text-zinc-500">
            {perfumeCount} parfums · {brandCount} marques
          </p>
        </div>
        
        {canEdit && (
          <div className="hidden md:block">
            <Link href={activeTab === "perfumes" ? "/admin/perfumes/new" : "/admin/brands/new"}>
              <AdminButton leftIcon={Plus}>
                Ajouter {activeTab === "perfumes" ? "un parfum" : "une marque"}
              </AdminButton>
            </Link>
          </div>
        )}
      </div>

      <div className="relative flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <button
          onClick={() => onTabChange("perfumes")}
          className={`
            relative flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-300
            ${activeTab === "perfumes" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}
          `}
        >
          Parfums
          <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${activeTab === "perfumes" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-600"}`}>
            {perfumeCount}
          </span>
        </button>
        <button
          onClick={() => onTabChange("brands")}
          className={`
            relative flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-semibold transition-all duration-300
            ${activeTab === "brands" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}
          `}
        >
          Marques
          <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${activeTab === "brands" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-600"}`}>
            {brandCount}
          </span>
        </button>
      </div>
    </div>
  );
}
