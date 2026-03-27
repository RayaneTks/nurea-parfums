"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";

export function AdminNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-[var(--nurea-border)] bg-[var(--nurea-overlay)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
        <div className="min-w-0">
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] items-center text-[15px] font-semibold tracking-tight text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
          >
            Administration
          </Link>
          <p className="-mt-0.5 text-[11px] text-[var(--nurea-text-subtle)]">Catalogue Nurea</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-[44px] items-center gap-1.5 border border-[var(--nurea-border)] px-3 text-xs text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-border-hover)] hover:bg-[var(--nurea-surface-hover)] hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span>Site</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="inline-flex min-h-[44px] items-center gap-1.5 border border-[var(--nurea-border)] px-3 text-xs text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-border-hover)] hover:bg-[var(--nurea-surface-hover)] hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
