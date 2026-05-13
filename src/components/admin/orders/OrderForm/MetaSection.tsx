"use client";

import { SectionCard } from "../../ui/SectionCard";
import { AdminInput } from "../../ui/AdminInput";

type MetaSectionProps = {
  deliveryAt: string;
  notes: string;
  onDeliveryChange: (v: string) => void;
  onNotesChange: (v: string) => void;
};

export function MetaSection({ deliveryAt, notes, onDeliveryChange, onNotesChange }: MetaSectionProps) {
  return (
    <SectionCard>
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Détails</h2>
      <div className="space-y-3">
        <AdminInput
          label="Livraison prévue (opt.)"
          type="datetime-local"
          value={deliveryAt}
          onChange={(e) => onDeliveryChange(e.target.value)}
        />
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-admin-muted">
            Notes (opt.)
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Précisions internes (allergies, contraintes, etc.)"
            className="w-full rounded-xl border border-admin-border bg-admin-surface px-4 py-3 text-[16px] text-admin-text outline-none focus-visible:border-admin-accent focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
          />
        </div>
      </div>
    </SectionCard>
  );
}
