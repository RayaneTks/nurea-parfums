"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, ExternalLink, LogOut } from "lucide-react";

export function AdminNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-white/10 bg-[var(--nurea-overlay)]/85 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 md:px-6">
        <div className="min-w-0">
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--nurea-text)] transition-all duration-200 ease-out-expo hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
          >
            <Compass className="h-4 w-4 text-[var(--nurea-text-subtle)]" aria-hidden />
            Administration
          </Link>
          <p className="-mt-0.5 text-[11px] text-[var(--nurea-text-subtle)]">Catalogue Nurea</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-[44px] w-11 items-center justify-center text-[var(--nurea-text-muted)] transition-all duration-200 ease-out-expo hover:bg-white/5 hover:text-[var(--nurea-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>

          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="inline-flex min-h-[44px] w-11 items-center justify-center text-[var(--nurea-text-muted)] transition-all duration-200 ease-out-expo hover:bg-white/5 hover:text-[var(--nurea-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
