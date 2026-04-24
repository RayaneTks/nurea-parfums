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
        <h1 className="font-[family-name:var(--font-serif)] text-[32px] font-normal leading-tight tracking-tight text-[var(--admin-text)]">
          Tableau de bord
        </h1>
        <p className="mt-2 text-[15px] leading-snug text-[var(--admin-muted)]">
          Raccourcis : caisse, catalogue et outils.
        </p>
      </div>

      <div className="grid gap-3">
        <Link
          href="/admin/caisse"
          className="group flex items-stretch gap-4 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:bg-[var(--admin-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--admin-border)] bg-[var(--admin-tab-active)] text-[var(--admin-accent)] transition-colors group-hover:border-[var(--admin-accent)]/40">
            <Wallet className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <h2 className="text-[17px] font-semibold tracking-tight text-[var(--admin-text)]">Caisse</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--admin-muted)]">
              Ventes, comptabilité et commandes clients.
            </p>
          </div>
          <div className="flex shrink-0 items-center text-[var(--admin-muted)]">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </div>
        </Link>

        <Link
          href="/admin/catalogue"
          className="group flex items-stretch gap-4 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-sm transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:bg-[var(--admin-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--admin-border)] bg-[rgba(139,58,58,0.08)] text-[var(--admin-accent-solid)] transition-colors group-hover:bg-[rgba(139,58,58,0.12)]">
            <PackageSearch className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <h2 className="text-[17px] font-semibold tracking-tight text-[var(--admin-text)]">Catalogue</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--admin-muted)]">
              Parfums, marques et visibilité sur la boutique.
            </p>
          </div>
          <div className="flex shrink-0 items-center text-[var(--admin-muted)]">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </div>
        </Link>

        <div className="flex items-stretch gap-4 border border-[var(--admin-border)] bg-[var(--admin-elevated)]/60 p-4 opacity-75">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-muted)]">
            <Settings2 className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-semibold text-[var(--admin-muted)]">Paramètres</h2>
              <span className="border border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                Bientôt
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--admin-muted)]">
              Comptes admin et options avancées.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-[12px] text-[var(--admin-muted)]">
        Astuce : ajoutez cette page à l&apos;écran d&apos;accueil pour une ouverture en plein écran.
      </p>
    </main>
  );
}
