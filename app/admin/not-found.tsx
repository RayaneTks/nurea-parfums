import Link from "next/link";
import { Compass, Home } from "lucide-react";

/**
 * Page 404 admin — visuel cohérent avec le shell admin (pas le 404 du shop).
 * Doit rester server component (pas de "use client") pour Next.js Metadata API.
 */
export default function AdminNotFound() {
  return (
    <main
      id="main-content"
      className="flex-1 px-4 pt-6 pb-8"
      style={{ paddingBottom: "var(--admin-scroll-bottom-pad)" }}
    >
      <div
        className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-4 rounded-[18px] bg-[var(--admin-surface)] px-5 py-6 text-center shadow-[var(--admin-shadow-md)]"
        style={{ border: "1px solid var(--admin-border)" }}
      >
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: "var(--admin-surface-muted)",
            color: "var(--admin-text-muted)",
          }}
        >
          <Compass size={24} aria-hidden />
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-[var(--admin-text)]">
            Page introuvable
          </h1>
          <p className="mt-1 text-[13px] text-[var(--admin-text-muted)]">
            Cette section n&apos;existe pas ou plus. Reviens au tableau de bord pour
            continuer la gestion.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[var(--admin-accent)] px-4 text-[15px] font-semibold text-white tap-scale focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
        >
          <Home size={16} aria-hidden />
          Tableau de bord
        </Link>
      </div>
    </main>
  );
}
