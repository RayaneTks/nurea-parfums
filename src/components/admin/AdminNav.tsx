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
    <header className="sticky top-0 z-[60] border-b border-black/[0.06] bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#111]/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/admin"
          className="text-[15px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Admin
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            className="flex h-9 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[#888] transition-colors hover:bg-black/[0.04] hover:text-[#555] dark:text-[#777] dark:hover:bg-white/[0.06] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Voir le site</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            aria-label="Se deconnecter"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#666] transition-colors hover:bg-black/[0.04] hover:text-[#1a1a1a] dark:text-[#999] dark:hover:bg-white/[0.06] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
