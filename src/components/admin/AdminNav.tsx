"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

const navLinkBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-sm border px-3 py-2.5 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)] sm:min-h-10 sm:py-2";

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const isDashboard = pathname === "/admin" || pathname === "/admin/";
  const showFormQuickBar = pathname.startsWith("/admin/perfumes") && !isDashboard;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  const linkClass = (active: boolean) =>
    clsx(
      navLinkBase,
      active
        ? "border-[var(--nurea-accent)]/50 bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
        : "border-transparent text-[var(--nurea-text-muted)] hover:border-[var(--nurea-border-hover)] hover:bg-[var(--nurea-surface-hover)] hover:text-[var(--nurea-text)]"
    );

  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--nurea-bg)]/88">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 md:px-10 md:pb-4">
          <Link
            href="/admin"
            className="group min-w-0 shrink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)]"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] text-[var(--nurea-cuivre)] transition-colors group-hover:border-[var(--nurea-accent)]/40">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 text-left">
                <span className="block font-serif text-lg leading-tight text-[var(--nurea-text)] md:text-xl">
                  Studio Nurea
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--nurea-text-subtle)] md:text-[12px]">
                  Administration catalogue
                </span>
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <nav
              aria-label="Actions rapides"
              className="hidden items-center gap-1 md:flex md:gap-2"
            >
              <Link href="/admin" className={linkClass(isDashboard)} aria-current={isDashboard ? "page" : undefined}>
                <LayoutDashboard className="h-4 w-4 shrink-0 text-[var(--nurea-cuivre)]" aria-hidden />
                <span>Tableau</span>
              </Link>
              <Link
                href="/admin/perfumes/new"
                className={linkClass(pathname === "/admin/perfumes/new")}
                aria-current={pathname === "/admin/perfumes/new" ? "page" : undefined}
              >
                <PlusCircle className="h-4 w-4 shrink-0 text-[var(--nurea-accent)]" aria-hidden />
                <span>Nouveau parfum</span>
              </Link>
              <Link
                href="/"
                className={linkClass(false)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                <span>Vitrine</span>
              </Link>
            </nav>

            <button
              type="button"
              onClick={logout}
              aria-label="Se déconnecter"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-[var(--nurea-border-hover)] p-2 text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)]/45 hover:text-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)] md:min-h-10 md:min-w-10"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile : raccourcis sur les pages fiche (le dock n’y est pas affiché) */}
        {showFormQuickBar ? (
          <div className="flex items-center gap-2 border-t border-[var(--nurea-border)] px-3 py-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:hidden">
            <Link
              href="/admin"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--nurea-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)]"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
              Tableau
            </Link>
            <Link
              href="/admin/perfumes/new"
              className={clsx(
                "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border text-[11px] font-semibold uppercase tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)]",
                pathname === "/admin/perfumes/new"
                  ? "border-[var(--nurea-accent)]/50 bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                  : "border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] text-[var(--nurea-text-muted)]"
              )}
            >
              <PlusCircle className="h-3.5 w-3.5 text-[var(--nurea-accent)]" aria-hidden />
              Créer
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--nurea-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Vitrine
            </Link>
          </div>
        ) : null}
      </header>

      {/* Dock mobile : uniquement sur le tableau de bord (évite double barre avec le formulaire) */}
      {isDashboard ? (
        <nav
          aria-label="Navigation principale"
          className="fixed inset-x-0 bottom-0 z-[55] border-t border-[var(--nurea-border)] bg-[var(--nurea-surface)]/98 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-lg md:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-3 gap-1 px-2">
            <Link
              href="/admin"
              className={clsx(
                "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-sm text-[11px] font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)]",
                isDashboard
                  ? "text-[var(--nurea-accent)]"
                  : "text-[var(--nurea-text-muted)] active:bg-[var(--nurea-surface-hover)]"
              )}
              aria-current="page"
            >
              <LayoutDashboard className="h-5 w-5" aria-hidden />
              Tableau
            </Link>
            <Link
              href="/admin/perfumes/new"
              className="flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-sm text-[11px] font-medium tracking-wide text-[var(--nurea-text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)] active:bg-[var(--nurea-surface-hover)]"
            >
              <PlusCircle className="h-5 w-5 text-[var(--nurea-accent)]" aria-hidden />
              Créer
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-sm text-[11px] font-medium tracking-wide text-[var(--nurea-text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)] active:bg-[var(--nurea-surface-hover)]"
            >
              <ExternalLink className="h-5 w-5" aria-hidden />
              Vitrine
            </Link>
          </div>
        </nav>
      ) : null}
    </>
  );
}

/** Espace réservé sous le dock mobile (tableau de bord uniquement) */
export function AdminMobileDockSpacer() {
  return <div className="h-[4.25rem] shrink-0 md:hidden" aria-hidden />;
}
