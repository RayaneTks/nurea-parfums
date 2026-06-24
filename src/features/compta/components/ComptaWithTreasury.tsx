"use client";

import { useState } from "react";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
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

const TABS = [
  { value: "ventes" as const, label: "Ventes" },
  { value: "treso" as const, label: "Trésorerie" },
];

export function ComptaWithTreasury({
  sales,
  initialQuery,
  treasury,
  movements,
}: ComptaWithTreasuryProps) {
  const [tab, setTab] = useState<"ventes" | "treso">("ventes");

  return (
    <Stack gap={4}>
      <SegmentedControl options={TABS} value={tab} onChange={setTab} ariaLabel="Vue compta" />
      {tab === "ventes" ? (
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
