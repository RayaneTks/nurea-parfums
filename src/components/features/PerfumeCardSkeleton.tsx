"use client";

import type { FC } from "react";

export const PerfumeCardSkeleton: FC = () => {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-[3/4] w-full bg-[var(--nurea-surface-hover)] rounded-sm" />
      <div className="pt-3.5 space-y-2">
        <div className="h-2.5 w-1/3 bg-[var(--nurea-border-hover)]" />
        <div className="h-4 w-2/3 bg-[var(--nurea-border-hover)]" />
        <div className="h-3 w-1/2 bg-[var(--nurea-border-hover)]/60" />
      </div>
    </div>
  );
};

export const CatalogSkeleton: FC = () => {
  return (
    <div className="catalogue-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <PerfumeCardSkeleton key={i} />
      ))}
    </div>
  );
};
