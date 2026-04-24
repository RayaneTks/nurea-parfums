"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";

export function AdminTopBar() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-[60] border-b border-[var(--admin-border)] bg-[var(--admin-surface)]/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
        <Link
          href="/admin"
          className="flex min-h-[44px] min-w-[44px] items-center gap-2.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)]"
          aria-label="Admin — accueil"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
            <Image
              src="/branding/monogram/logo4_monogram_free_black_1024.svg"
              alt=""
              fill
              className="object-contain opacity-[0.88]"
              sizes="36px"
            />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-[var(--admin-text)] sm:inline">
            Admin
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-11 items-center justify-center text-[var(--admin-muted)] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)]"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 w-11 items-center justify-center text-[var(--admin-muted)] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-[var(--admin-accent-solid)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)]"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
