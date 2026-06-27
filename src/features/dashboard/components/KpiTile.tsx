import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/ui/primitives/Card";

type Tone = "default" | "accent" | "success" | "warning";

type KpiTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  /** Si fourni, la tuile devient cliquable vers cette page. */
  href?: string;
};

const labelClass = "text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]";

export function KpiTile({ label, value, hint, tone = "default", href }: KpiTileProps) {
  const inner = (
    <Card padding={3} tone={tone === "accent" ? "accent" : "surface"}>
      <p className={labelClass}>
        {label}
        {href ? <ChevronRight size={12} className="ml-1 inline -translate-y-px opacity-50" aria-hidden /> : null}
      </p>
      <p className="mt-1 text-[20px] font-bold leading-none">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">{hint}</p>
      ) : null}
    </Card>
  );
  if (!href) return inner;
  return (
    <Link href={href} prefetch className="block tap-scale">
      {inner}
    </Link>
  );
}
