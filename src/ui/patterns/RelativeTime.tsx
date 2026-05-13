import { cn } from "@/lib/utils";

type RelativeTimeProps = {
  date: Date | string;
  className?: string;
};

const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fmtFull = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return <span className={cn("text-[var(--admin-text-subtle)]", className)}>—</span>;
  }
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const deltaDays = Math.round((today - day) / 86_400_000);

  let label: string;
  if (deltaDays === 0) label = `Aujourd'hui · ${fmtTime.format(d)}`;
  else if (deltaDays === 1) label = `Hier · ${fmtTime.format(d)}`;
  else if (deltaDays > 1 && deltaDays < 7) label = `Il y a ${deltaDays} j.`;
  else if (deltaDays >= 7 && d.getFullYear() === new Date().getFullYear()) label = fmtShort.format(d);
  else label = fmtFull.format(d);

  return (
    <time dateTime={d.toISOString()} className={cn("tnum", className)}>
      {label}
    </time>
  );
}
