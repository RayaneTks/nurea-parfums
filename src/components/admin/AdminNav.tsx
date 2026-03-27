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
    <header className="sticky top-0 z-[60] bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-900/50">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link
          href="/admin"
          className="flex items-center gap-3 text-[16px] font-bold tracking-tight text-zinc-100 transition-all duration-300 hover:opacity-80 active:scale-95 focus-visible:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-inner">
            <span className="text-[13px] font-black text-white">N</span>
          </div>
          <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Admin
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
