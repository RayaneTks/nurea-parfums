import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, Settings2, ChevronRight, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Administration — Accueil",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-lg px-4 pb-6 pt-5 sm:px-5 sm:pt-6">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--admin-text)]">
          Tableau de bord
        </h1>
        <p className="mt-2 text-[15px] leading-snug text-[var(--admin-secondary)]">
          Raccourcis : caisse, catalogue et outils.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/admin/caisse"
          className="group flex items-stretch gap-4 rounded-[14px] border border-[var(--admin-separator)] bg-[var(--admin-grouped-bg)] p-4 transition-opacity duration-150 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[var(--admin-fill)] text-[var(--admin-accent)]">
            <Wallet className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <h2 className="text-[17px] font-semibold tracking-tight text-[var(--admin-text)]">Caisse</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-[var(--admin-secondary)]">
              Ventes, comptabilité et commandes clients.
            </p>
          </div>
          <div className="flex shrink-0 items-center text-[var(--admin-tertiary)]">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </div>
        </Link>

        <Link
          href="/admin/catalogue"
          className="group flex items-stretch gap-4 rounded-[14px] border border-[var(--admin-separator)] bg-[var(--admin-grouped-bg)] p-4 transition-opacity duration-150 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[var(--admin-fill)] text-[var(--admin-accent)]">
            <PackageSearch className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <h2 className="text-[17px] font-semibold tracking-tight text-[var(--admin-text)]">Catalogue</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-[var(--admin-secondary)]">
              Parfums, marques et visibilité sur la boutique.
            </p>
          </div>
          <div className="flex shrink-0 items-center text-[var(--admin-tertiary)]">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </div>
        </Link>

        <div className="flex items-stretch gap-4 rounded-[14px] border border-[var(--admin-separator)] bg-[var(--admin-fill)]/50 p-4 opacity-60">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[var(--admin-grouped-bg)] text-[var(--admin-tertiary)]">
            <Settings2 className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-semibold text-[var(--admin-secondary)]">Paramètres</h2>
              <span className="rounded-[6px] border border-[var(--admin-separator)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-tertiary)]">
                Bientôt
              </span>
            </div>
            <p className="mt-1 text-[15px] leading-relaxed text-[var(--admin-secondary)]">
              Comptes admin et options avancées.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-[13px] text-[var(--admin-tertiary)]">
        Astuce : ajoutez cette page à l&apos;écran d&apos;accueil pour une ouverture en plein écran.
      </p>
    </main>
  );
}
