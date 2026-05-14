import type { ReactNode } from "react";
import { Card } from "@/ui/primitives/Card";

type Tone = "default" | "accent" | "success" | "warning";

type KpiTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
};

const labelClass = "text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]";

export function KpiTile({ label, value, hint, tone = "default" }: KpiTileProps) {
  return (
    <Card padding={3} tone={tone === "accent" ? "accent" : "surface"}>
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-[20px] font-bold leading-none">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">{hint}</p>
      ) : null}
    </Card>
  );
}
