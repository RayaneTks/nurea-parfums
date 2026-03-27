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
    <header className="sticky top-0 z-[60] border-b border-black/[0.08] bg-white/95 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#101010]/95">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
        <Link
          href="/admin"
          className="inline-flex min-h-[44px] items-center text-sm font-semibold tracking-tight text-[#1a1a1a] dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Admin
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-[44px] items-center gap-1.5 px-2.5 text-xs text-[#888] transition-colors hover:text-[#1a1a1a] dark:text-[#999] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span>Site</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="inline-flex min-h-[44px] items-center gap-1.5 px-2.5 text-xs text-[#888] transition-colors hover:text-[#1a1a1a] dark:text-[#999] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
