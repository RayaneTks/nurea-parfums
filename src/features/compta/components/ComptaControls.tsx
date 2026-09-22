"use client";

import type { PeriodParam } from "@/contracts/chiffres";
import type { ComptaView } from "@/contracts/compta";
import { Chip } from "@/ui/primitives/Chip";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { PERIOD_CHIPS } from "./compta-model";
import { PeriodStepper } from "./PeriodStepper";
import { useReplaceUrl } from "./useReplaceUrl";

const VIEW_OPTIONS = [
  { value: "ventes", label: "Ventes" },
  { value: "tresorerie", label: "Trésorerie" },
] as const satisfies readonly { value: ComptaView; label: string }[];

/** « Ventes | Trésorerie » (06 E03 zones communes) : la vue vit dans l'URL (`vue`). */
export function ComptaViewSwitch({ value, hrefs }: { value: ComptaView; hrefs: Record<ComptaView, string> }) {
  const [go] = useReplaceUrl();
  return (
    <SegmentedControl
      ariaLabel="Vue de la Compta"
      options={VIEW_OPTIONS}
      value={value}
      onChange={(next) => {
        if (next !== value) go(hrefs[next]);
      }}
    />
  );
}

type PeriodSelectorProps = {
  periode: PeriodParam;
  /** Adresse de chaque période, construite par la page (même vue, période courante). */
  hrefs: Record<PeriodParam, string>;
  /** Navigateur « ‹ septembre 2026 › » ; absent pour « Tout ». */
  navigation: { label: string; previousHref: string; nextHref: string | null } | null;
};

/**
 * Sélecteur de période (06 E03 zone 1) : chips « Jour · Semaine · Mois · Année · Tout » (`periode`), rangée
 * défilable à 320 px, puis le navigateur (`ref`). Rendu tout de suite, avant les chiffres.
 */
export function PeriodSelector({ periode, hrefs, navigation }: PeriodSelectorProps) {
  const [go] = useReplaceUrl();
  return (
    <div className="flex flex-col gap-2">
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Période"
      >
        {PERIOD_CHIPS.map((chip) => (
          <Chip key={chip.value} active={chip.value === periode} onClick={() => chip.value !== periode && go(hrefs[chip.value])}>
            {chip.label}
          </Chip>
        ))}
      </div>
      {navigation ? (
        <PeriodStepper
          label={navigation.label}
          previousHref={navigation.previousHref}
          nextHref={navigation.nextHref}
          previousLabel="Période précédente"
          nextLabel="Période suivante"
        />
      ) : null}
    </div>
  );
}
