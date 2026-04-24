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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--admin-fill)]">
        <Inbox className="h-7 w-7 text-[var(--admin-tertiary)]" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-[20px] font-semibold leading-tight tracking-tight text-[var(--admin-text)]">{title}</h3>
      <p className="mt-2 max-w-[280px] text-[15px] leading-snug text-[var(--admin-secondary)]">{description}</p>
      {hasSearch && onClearSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-6 min-h-[44px] px-4 text-[17px] font-normal text-[var(--admin-accent)] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]"
        >
          Effacer la recherche
        </button>
      )}
    </div>
  );
}
