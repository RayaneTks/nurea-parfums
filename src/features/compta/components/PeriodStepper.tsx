"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/ui/primitives/Button";
import { useReplaceUrl } from "./useReplaceUrl";

type PeriodStepperProps = {
  /** « septembre 2026 », « semaine du 14 septembre 2026 ». */
  label: string;
  previousHref: string;
  /** `null` : la période affichée contient aujourd'hui, rien à lire après. */
  nextHref: string | null;
  /** « Période précédente », « Mois précédent ». */
  previousLabel: string;
  nextLabel: string;
};

/** Navigateur « ‹ septembre 2026 › » (06 E03 zone 1, E04 zone 1) : flèches de 44 px, libellé au centre. */
export function PeriodStepper({ label, previousHref, nextHref, previousLabel, nextLabel }: PeriodStepperProps) {
  const [go, pending] = useReplaceUrl();
  return (
    <div className="flex items-center justify-between gap-2" data-period-stepper aria-busy={pending || undefined}>
      <Button variant="ghost" iconOnly ariaLabel={previousLabel} onClick={() => go(previousHref)}>
        <ChevronLeft size={20} />
      </Button>
      <p className="admin-type-body-em min-w-0 flex-1 truncate text-center text-[var(--admin-text)]" aria-live="polite">
        {label}
      </p>
      <Button variant="ghost" iconOnly ariaLabel={nextLabel} disabled={nextHref === null} onClick={() => nextHref && go(nextHref)}>
        <ChevronRight size={20} />
      </Button>
    </div>
  );
}
