"use client";

type BadgeVariant = "success" | "warning" | "info" | "neutral";

interface AdminBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export function AdminBadge({ label, variant = "neutral", dot = false }: AdminBadgeProps) {
  const variants = {
    success: "bg-[rgba(45,106,79,0.12)] text-[#1B4332] border-[rgba(45,106,79,0.28)]",
    warning: "bg-[rgba(180,120,40,0.12)] text-[#5C3D0A] border-[rgba(180,120,40,0.35)]",
    info: "bg-[rgba(139,58,58,0.1)] text-[var(--admin-accent-solid)] border-[rgba(139,58,58,0.22)]",
    neutral: "bg-[var(--admin-elevated)] text-[var(--admin-muted)] border-[var(--admin-border)]",
  };

  const dots = {
    success: "bg-[#2D6A4F]",
    warning: "bg-[#B8860B]",
    info: "bg-[var(--admin-accent-solid)]",
    neutral: "bg-[var(--admin-muted)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${variants[variant]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 ${dots[variant]}`} />}
      {label}
    </span>
  );
}
