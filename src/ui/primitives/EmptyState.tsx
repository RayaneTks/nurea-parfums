import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-10",
        className,
      )}
    >
      {Icon ? (
        <span
          aria-hidden
          className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--admin-surface-muted)" }}
        >
          <Icon size={24} className="text-[var(--admin-text-muted)]" />
        </span>
      ) : null}
      <p className="text-[16px] font-semibold text-[var(--admin-text)]">{title}</p>
      {description ? (
        <p className="mt-1 text-[13px] text-[var(--admin-text-muted)] max-w-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
