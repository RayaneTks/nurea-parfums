"use client";

import type { PocketSummary } from "@/contracts/treasury";
import { Chip } from "@/ui/primitives/Chip";
import { Text } from "@/ui/primitives/Text";

type PocketChipsProps = {
  pockets: readonly PocketSummary[];
  value: string | null;
  onChange: (pocketId: string) => void;
  /** « Poche » par défaut. */
  label?: string;
};

/**
 * Chips de poche (06 S02 zone 3) : poches actives dans l'ordre choisi, « Non attribué » en dernier, la poche par
 * défaut pré-sélectionnée par l'appelant ; aide « Banque sera proposée la prochaine fois » après un changement (N2).
 * Une seule poche : simple texte.
 */
export function PocketChips({ pockets, value, onChange, label = "Poche" }: PocketChipsProps) {
  const chosen = pockets.find((pocket) => pocket.id === value) ?? null;
  const proposed = pockets.find((pocket) => pocket.isDefault) ?? null;
  const changed = chosen !== null && proposed !== null && chosen.id !== proposed.id && !chosen.isSystem;

  if (pockets.length === 1 && chosen) {
    return (
      <Text variant="caption" tone="muted">
        {label} : {chosen.name}
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <Text variant="caption" tone="muted" className="font-semibold">
        {label}
      </Text>
      <div className="flex flex-wrap gap-2">
        {pockets.map((pocket) => (
          <Chip key={pocket.id} active={pocket.id === value} onClick={() => onChange(pocket.id)}>
            {pocket.name}
          </Chip>
        ))}
      </div>
      {changed ? (
        <Text variant="caption" tone="muted">
          {chosen.name} sera proposée la prochaine fois.
        </Text>
      ) : null}
    </div>
  );
}
