import type { ReactNode } from "react";

export function AdminLargeTitle({
  title,
  subtitle,
  accessory,
}: {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--admin-text)] sm:text-[32px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-[15px] leading-snug text-[var(--admin-secondary)]">{subtitle}</p> : null}
      </div>
      {accessory ? <div className="shrink-0 pt-1">{accessory}</div> : null}
    </header>
  );
}
