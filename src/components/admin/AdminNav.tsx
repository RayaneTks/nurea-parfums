"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";

export function AdminNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--nurea-bg)]/88">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-10 md:pb-4">
        <Link
          href="/admin"
          className="group flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] text-[var(--nurea-cuivre)] transition-colors group-hover:border-[var(--nurea-accent)]/40">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="font-serif text-lg leading-tight text-[var(--nurea-text)] md:text-xl">
            Nurea Admin
          </span>
        </Link>

        <button
          type="button"
          onClick={logout}
          aria-label="Se déconnecter"
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--nurea-border-hover)] p-2 text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)]/45 hover:text-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)] md:min-h-10 md:min-w-10"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
