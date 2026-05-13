import type { ReactNode } from "react";
import { Heading } from "../primitives/Heading";

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <header className={["flex items-end justify-between gap-3", className].filter(Boolean).join(" ")}>
      <div className="min-w-0">
        <Heading level={1}>{title}</Heading>
        {description ? (
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
