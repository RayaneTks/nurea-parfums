import { cn } from "@/lib/utils";

type DateLabelProps = {
  date: Date | string;
  /** "short" = "12 mai", "long" = "12 mai 2026", "datetime" = "12 mai · 14:30". */
  format?: "short" | "long" | "datetime";
  className?: string;
};

const fmtShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function DateLabel({ date, format = "short", className }: DateLabelProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return <span className={cn("text-[var(--admin-text-subtle)]", className)}>—</span>;
  }
  let text: string;
  if (format === "long") text = fmtLong.format(d);
  else if (format === "datetime") text = `${fmtShort.format(d)} · ${fmtTime.format(d)}`;
  else text = fmtShort.format(d);
  return <span className={cn("tnum", className)}>{text}</span>;
}
