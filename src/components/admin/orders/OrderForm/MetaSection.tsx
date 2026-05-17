"use client";

import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Textarea } from "@/ui/primitives/Textarea";
import { Stack } from "@/ui/primitives/Stack";

type MetaSectionProps = {
  deliveryAt: string;
  notes: string;
  onDeliveryChange: (v: string) => void;
  onNotesChange: (v: string) => void;
};

export function MetaSection({ deliveryAt, notes, onDeliveryChange, onNotesChange }: MetaSectionProps) {
  return (
    <Card padding={3}>
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--admin-text)]">Détails</h2>
      <Stack gap={2}>
        <Input
          label="Livraison prévue (opt.)"
          type="datetime-local"
          value={deliveryAt}
          onChange={(e) => onDeliveryChange(e.target.value)}
          enterKeyHint="next"
        />
        <Textarea
          label="Notes (opt.)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Précisions internes (allergies, contraintes, etc.)"
          enterKeyHint="done"
        />
      </Stack>
    </Card>
  );
}
