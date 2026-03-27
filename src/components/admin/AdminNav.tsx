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
    <header className="sticky top-0 z-[60] bg-zinc-950/80 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
        <Link
          href="/admin"
          className="flex min-h-[44px] items-center gap-2.5 text-[15px] font-semibold tracking-tight text-zinc-100 transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-b from-zinc-700 to-zinc-800 text-[11px] font-bold text-zinc-300">N</span>
          Admin
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-[15px] w-[15px]" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <LogOut className="h-[15px] w-[15px]" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
