import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center px-6 py-14 rounded-2xl",
        "border border-dashed border-admin-border bg-admin-surface/50",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-admin-accent-subtle border border-admin-border-hover">
          <Icon className="h-6 w-6 text-admin-accent" aria-hidden strokeWidth={1.8} />
        </div>
      ) : null}
      <h2 className="font-serif text-[20px] leading-[1.15] tracking-[-0.01em] text-admin-text">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-[14px] leading-relaxed text-admin-muted max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
