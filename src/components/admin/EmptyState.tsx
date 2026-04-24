"use client";

import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  onClearSearch?: () => void;
  hasSearch?: boolean;
}

export function EmptyState({ title, description, onClearSearch, hasSearch }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
        <Inbox className="h-7 w-7 text-[var(--admin-muted)]" aria-hidden />
      </div>
      <h3 className="text-[17px] font-semibold tracking-tight text-[var(--admin-text)]">{title}</h3>
      <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-[var(--admin-muted)]">{description}</p>
      {hasSearch && onClearSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-6 text-[13px] font-semibold text-[var(--admin-accent-solid)] underline decoration-[var(--admin-border)] underline-offset-4 transition-colors hover:text-[var(--admin-accent)]"
        >
          Effacer la recherche
        </button>
      )}
    </div>
  );
}
