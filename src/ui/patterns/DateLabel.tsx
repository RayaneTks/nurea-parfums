import { cn } from "@/lib/utils";
import { capitalizeFirst, formatDate, toDate, type DateFormat } from "./date-format";

type DateLabelProps = {
  /** `Date` ou chaîne ISO (DTO). */
  date: Date | string;
  /** Défaut `day` : « jeu. 17 sept. ». */
  format?: DateFormat;
  /** Capitale initiale, pour un libellé qui ouvre une ligne. */
  capitalize?: boolean;
  className?: string;
};

/** Date absolue, Europe/Paris, typographie française (05 §3.2). */
export function DateLabel({ date, format = "day", capitalize = false, className }: DateLabelProps) {
  const d = toDate(date);
  if (!d) return <span className={cn("text-[var(--admin-text-subtle)]", className)}>—</span>;
  const text = formatDate(d, format);
  return (
    <time dateTime={d.toISOString()} className={cn("tnum", className)} suppressHydrationWarning>
      {capitalize ? capitalizeFirst(text) : text}
    </time>
  );
}
