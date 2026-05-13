import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "success" | "danger" | "cuivre";
  className?: string;
}

const toneText: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-admin-text",
  accent: "text-admin-accent",
  success: "text-[var(--admin-success)]",
  danger: "text-admin-danger",
  cuivre: "text-admin-cuivre",
};

export function StatCard({ label, value, hint, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-admin-border bg-admin-surface shadow-admin-sm",
        "px-4 py-3 min-w-0",
        className,
      )}
    >
      <p className="text-[11px] text-admin-subtle font-medium">{label}</p>
      <p
        className={cn(
          "mt-2 font-serif text-[22px] leading-none tabular-nums tracking-[-0.01em] break-words",
          toneText[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] text-admin-subtle">{hint}</p> : null}
    </div>
  );
}
