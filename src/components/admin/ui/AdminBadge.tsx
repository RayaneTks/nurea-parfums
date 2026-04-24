"use client";

type BadgeVariant = "success" | "warning" | "info" | "neutral";

interface AdminBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export function AdminBadge({ label, variant = "neutral", dot = false }: AdminBadgeProps) {
  const variants = {
    success: "bg-[rgba(50,215,75,0.14)] text-[var(--admin-success)] border-[rgba(50,215,75,0.35)]",
    warning: "bg-[rgba(255,214,10,0.12)] text-[#FFD60A] border-[rgba(255,214,10,0.35)]",
    info: "bg-[var(--admin-accent-muted)] text-[var(--admin-accent)] border-[rgba(10,132,255,0.35)]",
    neutral: "bg-[var(--admin-fill)] text-[var(--admin-secondary)] border-[var(--admin-border)]",
  };

  const dots = {
    success: "bg-[var(--admin-success)]",
    warning: "bg-[#FFD60A]",
    info: "bg-[var(--admin-accent)]",
    neutral: "bg-[var(--admin-muted)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${variants[variant]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[variant]}`} />}
      {label}
    </span>
  );
}
