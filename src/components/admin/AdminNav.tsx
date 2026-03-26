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
    <header className="border-b border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-4 py-4 md:px-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)]">
          <Link href="/admin" className="text-[var(--nurea-accent)]">
            Catalogue admin
          </Link>
          <Link href="/admin/perfumes/new" className="hover:text-[var(--nurea-accent)]">
            Nouveau parfum
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
          >
            Voir le site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="border border-[var(--nurea-border-hover)] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[var(--nurea-text)] hover:border-[var(--nurea-accent)]"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
