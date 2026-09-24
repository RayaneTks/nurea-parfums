import type { FC } from "react";
import { Monogram } from "./Monogram";
import { cn } from "@/lib/utils";

interface FlaconLabelProps {
  name: string;
  /** Concentration, en toutes lettres. */
  concentration?: string;
  /** Contenance en ml — 10, 50 ou 80 (`src/domain/sale-line.ts`). */
  volumeMl?: number;
  className?: string;
}

/**
 * L'étiquette des flacons Nuréa, telle que la charte la décrit (§ 06) :
 * monogramme, nom, concentration, contenance. « Jamais de prix ni de marque
 * tierce. »
 *
 * Elle illustre ce que le client reçoit réellement. Les photos du catalogue
 * montrent les flacons d'origine des marques ; le parfum, lui, est remis dans
 * un flacon Nuréa. Montrer l'étiquette dit cette différence mieux qu'une
 * phrase — et en fait une signature plutôt qu'une réserve.
 *
 * Proportions de l'étiquette imprimée : 44 × 60 mm.
 */
export const FlaconLabel: FC<FlaconLabelProps> = ({
  name,
  concentration = "Eau de parfum",
  volumeMl = 80,
  className,
}) => (
  <div
    className={cn(
      "flex aspect-[44/60] flex-col items-center justify-between border border-nurea-border-strong bg-nurea-surface px-6 py-8 text-center",
      className,
    )}
  >
    <Monogram className="w-12 text-nurea-accent" />
    <p className="nurea-name text-nurea-text">{name}</p>
    <div className="flex flex-col items-center gap-2">
      <span aria-hidden className="h-px w-8 bg-nurea-border-strong" />
      <p className="nurea-label text-nurea-subtle">{concentration}</p>
      <p className="nurea-label">{volumeMl} ml</p>
    </div>
  </div>
);
