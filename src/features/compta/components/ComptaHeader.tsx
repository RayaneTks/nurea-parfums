"use client";

import { SearchField } from "@/ui/primitives/SearchField";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Heading } from "@/ui/primitives/Heading";
import type { Period } from "@/server/sales/queries";

const PERIOD_OPTIONS = [
  { value: "week" as const, label: "Semaine" },
  { value: "month" as const, label: "Mois" },
  { value: "all" as const, label: "Tout" },
];

type ComptaHeaderProps = {
  query: string;
  onQueryChange: (next: string) => void;
  period: Period;
  onPeriodChange: (p: Period) => void;
};

export function ComptaHeader({ query, onQueryChange, period, onPeriodChange }: ComptaHeaderProps) {
  return (
    <div className="space-y-3">
      <Heading level={1}>Compta</Heading>
      <SearchField
        value={query}
        onChange={onQueryChange}
        placeholder="Rechercher un client…"
      />
      <SegmentedControl
        options={PERIOD_OPTIONS}
        value={period}
        onChange={onPeriodChange}
        ariaLabel="Période"
      />
    </div>
  );
}
