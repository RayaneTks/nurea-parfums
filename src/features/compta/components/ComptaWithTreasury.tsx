"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, Download } from "lucide-react";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Heading } from "@/ui/primitives/Heading";
import { Stack } from "@/ui/primitives/Stack";
import { ComptaListClient } from "./ComptaListClient";
import { TreasuryPanel } from "@/features/treasury/components/TreasuryPanel";
import type { ComptaListResult } from "@/server/sales/queries";
import type { TreasurySummary, MovementRow } from "@/server/treasury/queries";

type ComptaWithTreasuryProps = {
  sales: ComptaListResult;
  initialQuery: string;
  treasury: TreasurySummary;
  movements: MovementRow[];
};

type ComptaView = "ventes" | "tresorerie";

const TABS = [
  { value: "ventes" as const, label: "Ventes" },
  { value: "tresorerie" as const, label: "Trésorerie" },
];

/**
 * Écran Compta : deux vues sous un même titre.
 *
 * Le titre et les actions de page précèdent le sélecteur de vue — auparavant
 * le sélecteur coiffait le titre, ce qui le faisait lire comme une navigation
 * de niveau supérieur alors qu'il ne bascule qu'un contenu.
 *
 * La vue active vit dans l'URL (`?vue=`) pour que les liens profonds — la
 * tuile Trésorerie du tableau de bord, notamment — ouvrent la bonne vue.
 */
export function ComptaWithTreasury({
  sales,
  initialQuery,
  treasury,
  movements,
}: ComptaWithTreasuryProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin/compta";
  const searchParams = useSearchParams();

  const [view, setView] = useState<ComptaView>(() =>
    searchParams.get("vue") === "tresorerie" ? "tresorerie" : "ventes",
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (view === "tresorerie") params.set("vue", "tresorerie");
    else params.delete("vue");
    const next = params.toString();
    if (next === searchParams.toString()) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pathname, router]);

  return (
    <Stack gap={4}>
      <div className="flex items-center justify-between gap-3">
        <Heading level={1}>Compta</Heading>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/compta/export"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[var(--admin-surface)] px-3 text-[12px] font-medium text-[var(--admin-text)] tap-scale hover:bg-[var(--admin-surface-alt)]"
            style={{ border: "1px solid var(--admin-border-strong)" }}
          >
            <Download size={14} aria-hidden />
            Export
          </a>
          <Link
            href="/admin/lots"
            prefetch
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[var(--admin-surface)] px-3 text-[12px] font-medium text-[var(--admin-text)] tap-scale hover:bg-[var(--admin-surface-alt)]"
            style={{ border: "1px solid var(--admin-border-strong)" }}
          >
            <Boxes size={14} aria-hidden />
            Lots
          </Link>
        </div>
      </div>

      <SegmentedControl
        options={TABS}
        value={view}
        onChange={setView}
        ariaLabel="Vue de la comptabilité"
      />

      {view === "ventes" ? (
        <ComptaListClient initial={sales} initialQuery={initialQuery} />
      ) : (
        <TreasuryPanel
          total={treasury.total}
          unattributed={treasury.unattributed}
          pockets={treasury.pockets}
          movements={movements}
        />
      )}
    </Stack>
  );
}
