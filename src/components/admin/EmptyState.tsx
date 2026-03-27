"use client";

import { Search, X, Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  onClearSearch?: () => void;
  hasSearch?: boolean;
}

export function EmptyState({ title, description, onClearSearch, hasSearch }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 mb-4 shadow-xl">
        <Inbox className="h-8 w-8 text-zinc-700" />
      </div>
      <h3 className="text-[17px] font-semibold text-zinc-200">{title}</h3>
      <p className="mt-1.5 text-sm text-zinc-500 max-w-[240px] leading-relaxed">
        {description}
      </p>
      {hasSearch && onClearSearch && (
        <button
          onClick={onClearSearch}
          className="mt-6 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30"
        >
          Effacer la recherche
        </button>
      )}
    </div>
  );
}
