import type { ReactNode } from "react";

/** Bloc type « liste groupée » iOS (un seul fond, séparateurs internes). */
export function AdminGrouped({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[12px] border border-[var(--admin-separator)] bg-[var(--admin-grouped-bg)] ${className}`}
    >
      {children}
    </div>
  );
}

export function AdminGroupedSection({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? (
        <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--admin-secondary)]">
          {title}
        </h2>
      ) : null}
      <AdminGrouped>{children}</AdminGrouped>
    </section>
  );
}
