import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  tone?: "default" | "accent" | "muted";
  flat?: boolean;
}

export function SectionCard({
  children,
  className,
  interactive = false,
  tone = "default",
  flat = false,
  ...props
}: SectionCardProps) {
  const toneStyles = {
    default: "bg-admin-surface border-admin-border",
    accent: "bg-admin-accent-subtle border-admin-border-hover",
    muted: "bg-admin-surface-muted border-admin-border",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border transition-[border-color,box-shadow,transform,background-color] duration-200 ease-out-expo",
        toneStyles[tone],
        !flat && "shadow-admin-sm",
        interactive &&
          "cursor-pointer tap-scale admin-lift [@media(hover:hover)]:hover:border-admin-border-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
