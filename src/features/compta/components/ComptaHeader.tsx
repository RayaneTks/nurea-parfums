"use client";

import Link from "next/link";
import { Boxes, Download } from "lucide-react";
import { SearchField } from "@/ui/primitives/SearchField";
import { Heading } from "@/ui/primitives/Heading";

type ComptaHeaderProps = {
  query: string;
  onQueryChange: (next: string) => void;
};

export function ComptaHeader({ query, onQueryChange }: ComptaHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Heading level={1}>Compta</Heading>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/compta/export"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--admin-text)] tap-scale hover:bg-[var(--admin-surface-alt)]"
          >
            <Download size={14} aria-hidden />
            Export
          </a>
          <Link
            href="/admin/lots"
            prefetch
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--admin-text)] tap-scale hover:bg-[var(--admin-surface-alt)]"
          >
            <Boxes size={14} aria-hidden />
            Lots
          </Link>
        </div>
      </div>
      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder="Rechercher un client…"
      />
    </div>
  );
}
