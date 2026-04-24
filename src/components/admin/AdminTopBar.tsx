"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";

/** Barre supérieure type navigation bar iOS : neutre, sans logo vitrine. */
export function AdminTopBar() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-[var(--admin-separator)] bg-[var(--admin-elevated)]/92 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--admin-elevated)]/80">
      <div className="mx-auto flex h-[52px] max-w-lg items-center justify-between px-4">
        <Link
          href="/admin"
          className="flex min-h-[44px] min-w-[44px] items-center gap-3 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)]"
          aria-label="Accueil administration"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--admin-fill)] text-[14px] font-semibold text-[var(--admin-text)]"
            aria-hidden
          >
            A
          </span>
          <span className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-[var(--admin-text)]">
            Admin
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--admin-accent)] transition-opacity duration-150 ease-out active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)]"
            aria-label="Ouvrir le site public"
          >
            <ExternalLink className="h-[20px] w-[20px]" strokeWidth={2} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--admin-danger)] transition-opacity duration-150 ease-out active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)]"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-[20px] w-[20px]" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
