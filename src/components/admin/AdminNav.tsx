"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--nurea-bg)]/85">
      <div className="mx-auto max-w-[1200px] px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 md:px-10 md:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-serif text-lg text-[var(--nurea-text)] sm:text-xl">Administration</p>
            <p className="mt-0.5 text-[11px] text-[var(--nurea-text-subtle)] sm:text-[12px]">
              Catalogue Nurea Parfums
            </p>
          </div>
          <nav
            aria-label="Navigation admin"
            className="-mx-1 flex flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:flex-wrap sm:justify-end sm:gap-2 sm:pb-0 sm:overflow-visible"
          >
            <Link
              href="/admin"
              className="shrink-0 rounded-sm border border-transparent px-3 py-2.5 text-[12px] font-medium text-[var(--nurea-accent)] transition-colors hover:border-[var(--nurea-border-hover)] hover:bg-[var(--nurea-surface-hover)] sm:min-h-0 sm:py-2"
            >
              Liste
            </Link>
            <Link
              href="/admin/perfumes/new"
              className="shrink-0 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-accent-subtle)] px-3 py-2.5 text-[12px] font-medium text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] sm:py-2"
            >
              Nouveau parfum
            </Link>
            <Link
              href="/"
              className="shrink-0 rounded-sm border border-transparent px-3 py-2.5 text-[12px] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-border-hover)] hover:text-[var(--nurea-text)] sm:py-2"
            >
              Site public
            </Link>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-sm border border-[var(--nurea-border-hover)] px-3 py-2.5 text-[12px] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] active:scale-[0.99] sm:py-2"
            >
              Déconnexion
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
