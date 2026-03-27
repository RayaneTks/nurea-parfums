"use client";

type BadgeVariant = "success" | "warning" | "info" | "neutral";

interface AdminBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export function AdminBadge({ label, variant = "neutral", dot = false }: AdminBadgeProps) {
  const variants = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    neutral: "bg-zinc-800 text-zinc-400 border-zinc-700/50",
  };

  const dots = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
    neutral: "bg-zinc-500",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${variants[variant]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[variant]}`} />}
      {label}
    </span>
  );
}
