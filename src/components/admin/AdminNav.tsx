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
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/admin"
          className="inline-flex min-h-[44px] items-center text-[15px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Administration
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-black/[0.08] px-3 text-[12px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] hover:text-[#444] dark:border-white/[0.1] dark:text-[#b0b0b0] dark:hover:bg-white/[0.06] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span>Site</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            aria-label="Se deconnecter"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-red-200 px-3 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
