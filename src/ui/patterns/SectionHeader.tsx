import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Heading } from "../primitives/Heading";

type SectionHeaderProps = {
  title: string;
  description?: ReactNode;
  /**
   * L'action de création d'une liste vit ICI (« Nouvelle commande », « + Parfum ») :
   * pas de FAB (05 §3.2).
   */
  action?: ReactNode;
  /** 1 = titre de page (h1, défaut), 2 = titre de section (h2). */
  level?: 1 | 2;
  className?: string;
};

export function SectionHeader({ title, description, action, level = 1, className }: SectionHeaderProps) {
  return (
    <header className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <Heading level={level}>{title}</Heading>
        {description ? (
          <p className="admin-type-caption mt-0.5 text-[var(--admin-text-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
