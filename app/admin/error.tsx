"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

/**
 * Error boundary admin — capte les erreurs des Server/Client Components
 * sous /admin et affiche une UI cohérente plutôt qu'un écran blanc.
 *
 * Doit être un Client Component (Next.js exige "use client" pour error.tsx).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log côté client pour debug. À remplacer par un service de tracking
    // (Sentry, Posthog…) quand on en aura un.
    console.error("[admin/error]", error);
  }, [error]);

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
          style={{ background: "var(--admin-danger-bg)", color: "var(--admin-danger)" }}
        >
          <AlertTriangle size={24} aria-hidden />
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-[var(--admin-text)]">
            Quelque chose s&apos;est mal passé
          </h1>
          <p className="mt-1 text-[13px] text-[var(--admin-text-muted)]">
            Une erreur inattendue est survenue. Tu peux réessayer ou revenir au tableau de bord.
          </p>
          {error.digest ? (
            <p className="mt-2 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
              Réf : {error.digest}
            </p>
          ) : null}
        </div>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[var(--admin-accent)] px-4 text-[15px] font-semibold text-white tap-scale focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
          >
            <RotateCcw size={16} aria-hidden />
            Réessayer
          </button>
          <Link
            href="/admin"
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[var(--admin-surface-muted)] px-4 text-[15px] font-medium text-[var(--admin-text)] tap-scale focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
          >
            <Home size={16} aria-hidden />
            Tableau de bord
          </Link>
        </div>
      </div>
    </main>
  );
}
