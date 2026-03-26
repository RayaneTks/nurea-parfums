import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

/**
 * Squelette : authentification et CRUD catalogue à brancher (voir docs/catalog-database.md).
 */
export default function AdminHomePage() {
  return (
    <div className="grain min-h-screen bg-[var(--nurea-bg)] px-4 py-16 text-[var(--nurea-text)] md:px-10">
      <div className="mx-auto max-w-lg border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-8">
        <h1 className="font-serif text-2xl text-[var(--nurea-text)]">
          Espace administration
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
          Ce panneau sera relié à la base PostgreSQL (marques, parfums, file
          d&apos;import). Pour l&apos;instant, gérez les données via Prisma Studio
          ou des migrations.
        </p>
        <p className="mt-3 text-[12px] text-[var(--nurea-text-subtle)]">
          Sonde API :{" "}
          <code className="text-[11px]">GET /api/admin/health</code> avec{" "}
          <code className="text-[11px]">Authorization: Bearer …</code>
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-accent)]"
        >
          Retour au site
        </Link>
      </div>
    </div>
  );
}
