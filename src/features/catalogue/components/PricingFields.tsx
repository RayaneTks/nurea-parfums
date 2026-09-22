"use client";

import type { VolumeMl } from "@/domain/sale-line";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { FormSection } from "@/ui/patterns/FormSection";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput } from "@/ui/primitives/MoneyInput";
import {
  FORM_VOLUMES,
  costInEuros,
  isDraftEmpty,
  ratePlaceholder,
  type PricingDraft,
  type PricingDrafts,
} from "./pricing-model";

type PricingFieldsProps = {
  drafts: PricingDrafts;
  onChange: (volume: VolumeMl, draft: PricingDraft) => void;
  errors: Partial<Record<VolumeMl, Partial<Record<keyof PricingDraft, string>>>>;
  defaultRate: string;
};

const EMPTY: PricingDraft = { price: "", cost: "", rate: "" };

/** Chiffres, un séparateur décimal, espaces : ce qu'un coût ou un taux peut contenir. */
const decimalText = (text: string) => text.replace(/[^\d.,\s]/g, "");

function VolumeFields({
  volume,
  draft,
  onChange,
  errors,
  defaultRate,
}: {
  volume: VolumeMl;
  draft: PricingDraft;
  onChange: (draft: PricingDraft) => void;
  errors: Partial<Record<keyof PricingDraft, string>> | undefined;
  defaultRate: string;
}) {
  const euros = costInEuros(draft, defaultRate);
  return (
    <>
      <FormField label="Prix de vente" error={errors?.price}>
        {(field) => (
          <MoneyInput
            {...field}
            aria-label={`Prix du ${volume} ml`}
            value={draft.price}
            enterKeyHint="next"
            variant="elevated"
            onChange={(text) => onChange({ ...draft, price: text })}
          />
        )}
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Coût (DA)" error={errors?.cost}>
          {(field) => (
            <Input
              {...field}
              aria-label={`Coût du ${volume} ml en dinars`}
              inputMode="decimal"
              autoComplete="off"
              numeric
              variant="elevated"
              enterKeyHint="next"
              placeholder="9000"
              value={draft.cost}
              onChange={(event) => onChange({ ...draft, cost: decimalText(event.target.value) })}
            />
          )}
        </FormField>
        <FormField label="Taux" error={errors?.rate}>
          {(field) => (
            <Input
              {...field}
              aria-label={`Taux du ${volume} ml`}
              inputMode="decimal"
              autoComplete="off"
              numeric
              variant="elevated"
              enterKeyHint="done"
              placeholder={ratePlaceholder(defaultRate)}
              value={draft.rate}
              onChange={(event) => onChange({ ...draft, rate: decimalText(event.target.value) })}
            />
          )}
        </FormField>
      </div>
      {euros ? <p className="admin-type-caption tnum text-[var(--admin-text-muted)]">Coût en euros {euros}</p> : null}
      {!isDraftEmpty(draft) ? (
        <Button variant="text" size="sm" className="self-start text-[var(--admin-danger)]" onClick={() => onChange(EMPTY)}>
          Retirer ce volume
        </Button>
      ) : null}
    </>
  );
}

/**
 * Tarifs (06 E19 zone 3) : 80 ml ouvert, 10 et 50 ml repliés tant qu'ils sont vides. Prix en euros, coût en
 * dinars, taux (placeholder : le taux par défaut des réglages), légende « Coût en euros ».
 */
export function PricingFields({ drafts, onChange, errors, defaultRate }: PricingFieldsProps) {
  return (
    <>
      {FORM_VOLUMES.map((volume, index) => {
        const draft = drafts[volume];
        const fields = (
          <VolumeFields
            volume={volume}
            draft={draft}
            onChange={(next) => onChange(volume, next)}
            errors={errors[volume]}
            defaultRate={defaultRate}
          />
        );
        if (index === 0) {
          return (
            <FormSection key={volume} title={`Tarif · ${volume} ml`}>
              {fields}
            </FormSection>
          );
        }
        return (
          <CollapsibleSection
            key={volume}
            title={`Tarif · ${volume} ml`}
            summary={isDraftEmpty(draft) ? "Aucun prix" : draft.price ? `${draft.price} €` : "À compléter"}
            defaultOpen={!isDraftEmpty(draft) || errors[volume] !== undefined}
          >
            {fields}
          </CollapsibleSection>
        );
      })}
    </>
  );
}
