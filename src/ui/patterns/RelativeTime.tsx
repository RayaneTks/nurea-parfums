import { cn } from "@/lib/utils";
import { capitalizeFirst, formatRelative, formatDate, toDate } from "./date-format";

type RelativeTimeProps = {
  date: Date | string;
  capitalize?: boolean;
  className?: string;
};

/**
 * « hier · 9 h 05 », « il y a 3 j » sous 7 jours, date absolue au-delà.
 * Jours calendaires de Paris, pas des tranches de 24 h. L'infobulle porte la
 * date complète.
 */
export function RelativeTime({ date, capitalize = false, className }: RelativeTimeProps) {
  const d = toDate(date);
  if (!d) return <span className={cn("text-[var(--admin-text-subtle)]", className)}>—</span>;
  const text = formatRelative(d);
  return (
    <time
      dateTime={d.toISOString()}
      title={`${formatDate(d, "long")} · ${formatDate(d, "time")}`}
      className={cn("tnum", className)}
      // Le rendu serveur et le client peuvent tomber de part et d'autre de minuit.
      suppressHydrationWarning
    >
      {capitalize ? capitalizeFirst(text) : text}
    </time>
  );
}
