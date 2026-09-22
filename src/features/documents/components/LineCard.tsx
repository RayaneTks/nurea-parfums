"use client";

import { Trash2 } from "lucide-react";
import type { PricingRow } from "@/contracts/catalogue";
import { MAX_LINE_QUANTITY, VOLUMES_ML, isVolumeMl } from "@/domain/sale-line";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { GiftToggle } from "@/ui/patterns/GiftToggle";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Card } from "@/ui/primitives/Card";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput } from "@/ui/primitives/MoneyInput";
import { Stepper } from "@/ui/primitives/Stepper";
import { Text } from "@/ui/primitives/Text";
import { costSummary, priceHint, withGift, withQuantity, type LineDraft } from "./line-draft";

export type LineBadge = { label: string; tone: "danger" | "warning" | "neutral" | "accent" };

type LineCardProps = {
  line: LineDraft;
  /** Mémoire de prix du volume affiché (N8) : aide « dernier prix » / « Aucun prix mémorisé ». */
  pricing?: PricingRow;
  /** Un badge au plus (05 §3.3) ; « Hors catalogue » l'emporte, fourni par la carte. */
  badge?: LineBadge | null;
  /** Légende sous le nom : marque, « 2 déjà livrés ». */
  caption?: string;
  /** Messages du serveur de cette ligne, par champ (`volumeMl`, `unitPriceEur`…). */
  errors?: Readonly<Record<string, string>>;
  /** Refus porté par une ligne reprise hors règles (S01, 03 §4.3). */
  issue?: { field: string; message: string } | null;
  /** Rangée « Coût » ouverte (CTA « Ajouter le taux », refus sur le taux). */
  costOpen?: boolean;
  onChange: (next: LineDraft) => void;
  onVolume: (volumeMl: number) => void;
  /** À 1, le « − » devient « Retirer » ; absent : la quantité s'arrête à 1. */
  onRemove?: () => void;
  priceRef?: (element: HTMLInputElement | null) => void;
  cardRef?: (element: HTMLDivElement | null) => void;
};

/**
 * Une ligne en saisie (06 E11 zone 5, S01 zone 4 en édition) : vignette, nom · marque ; chips de volume 10 · 50 · 80
 * (changer re-remplit prix, coût et taux) ; quantité (à 1, « Retirer ») ; prix avec l'aide de la mémoire de prix ;
 * « Offert » ; rangée repliée « Coût » (coût en dinars, taux, note de la ligne, A-12) ; un badge au plus.
 */
export function LineCard({
  line,
  pricing,
  badge,
  caption,
  errors = {},
  issue,
  costOpen = false,
  onChange,
  onVolume,
  onRemove,
  priceRef,
  cardRef,
}: LineCardProps) {
  const issueFor = (field: string) => (issue?.field === field ? issue.message : undefined);
  const cost = costSummary(line);
  const hint = priceHint(line, pricing);
  const shownBadge: LineBadge | null = line.isOffCatalog ? { label: "Hors catalogue", tone: "neutral" } : (badge ?? null);

  return (
    <Card padding={3}>
      <div ref={cardRef} className="flex flex-col gap-3" data-edit-line={line.id}>
        <div className="flex items-start gap-3">
          <Avatar name={line.perfumeName} src={line.imageUrl} size="md" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="admin-type-body truncate font-medium text-[var(--admin-text)]">{line.perfumeName}</span>
            {caption ? (
              <Text variant="caption" tone="muted" truncate>
                {caption}
              </Text>
            ) : null}
          </div>
          {shownBadge ? <Badge tone={shownBadge.tone}>{shownBadge.label}</Badge> : null}
        </div>

        <div className="flex flex-col gap-1" role="group" aria-label={`Volume de ${line.perfumeName}`}>
          <div className="flex flex-wrap gap-2">
            {VOLUMES_ML.map((volume) => (
              <Chip key={volume} active={line.volumeMl === volume} onClick={() => onVolume(volume)}>
                {volume} ml
              </Chip>
            ))}
          </div>
          {!isVolumeMl(line.volumeMl) ? (
            <Text variant="caption" tone="warning">
              {errors.volumeMl ?? issueFor("volumeMl") ?? "Volume à choisir"}
            </Text>
          ) : errors.volumeMl ? (
            <Text variant="caption" tone="danger">
              {errors.volumeMl}
            </Text>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Stepper
            value={line.quantity}
            min={1}
            max={MAX_LINE_QUANTITY}
            onChange={(quantity) => onChange(withQuantity(line, quantity))}
            ariaLabel={`Quantité de ${line.perfumeName}`}
            decrementAtMin={onRemove ? { icon: <Trash2 size={16} />, ariaLabel: `Retirer ${line.perfumeName}`, onPress: onRemove } : undefined}
          />
          <GiftToggle checked={line.isGift} onChange={(checked) => onChange(withGift(line, checked))} />
        </div>

        {!line.isGift ? (
          <FormField label={`Prix de ${line.perfumeName}`} hint={hint ?? undefined} error={errors.unitPriceEur ?? issueFor("unitPriceEur")}>
            {(field) => (
              <MoneyInput
                ref={priceRef}
                {...field}
                value={line.price}
                onChange={(price) => onChange({ ...line, price, lastPrice: price })}
                enterKeyHint="next"
              />
            )}
          </FormField>
        ) : null}

        <CollapsibleSection
          key={`${line.id}-${costOpen ? "ouvert" : "replie"}`}
          title="Coût"
          summary={<span className={cost.unknown ? "text-[var(--admin-warning)]" : undefined}>{cost.text}</span>}
          defaultOpen={costOpen || Boolean(errors.exchangeRate || errors.unitCostDzd || issueFor("exchangeRate"))}
          bare
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField label={`Coût en dinars de ${line.perfumeName}`} error={errors.unitCostDzd}>
                {(field) => (
                  <Input {...field} inputMode="decimal" numeric value={line.cost} onChange={(e) => onChange({ ...line, cost: e.target.value })} enterKeyHint="next" />
                )}
              </FormField>
              <FormField label={`Taux de ${line.perfumeName}`} error={errors.exchangeRate ?? issueFor("exchangeRate")}>
                {(field) => (
                  <Input {...field} inputMode="decimal" numeric value={line.rate} onChange={(e) => onChange({ ...line, rate: e.target.value })} enterKeyHint="next" />
                )}
              </FormField>
            </div>
            <FormField label={`Note de ${line.perfumeName}`} error={errors.note}>
              {(field) => (
                <Input {...field} value={line.note} onChange={(e) => onChange({ ...line, note: e.target.value })} maxLength={500} enterKeyHint="done" />
              )}
            </FormField>
          </div>
        </CollapsibleSection>
      </div>
    </Card>
  );
}
