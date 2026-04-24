"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  // Détermination du fil d'ariane
  let crumb = "";
  if (pathname.includes("/catalogue")) crumb = "Catalogue";
  else if (pathname.includes("/caisse")) crumb = "Caisse";
  else if (pathname.includes("/perfumes/new")) crumb = "Nouveau parfum";
  else if (pathname.includes("/perfumes/")) crumb = "Édition parfum";
  else if (pathname.includes("/brands/new")) crumb = "Nouvelle marque";
  else if (pathname.includes("/brands/")) crumb = "Édition marque";

  return (
    <header className="sticky top-0 z-[60] bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-900/50 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link
          href="/admin"
          className="flex items-center gap-3 text-[16px] font-bold tracking-tight text-zinc-100 transition-all duration-300 hover:opacity-80 active:scale-95 focus-visible:outline-none"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
            <Image 
              src="/branding/monogram/logo4_monogram_free_white_1024.svg" 
              alt="Logo Nuréa" 
              fill 
              className="object-contain"
              sizes="40px"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent hidden sm:inline-block">
              Admin
            </span>
            {crumb && (
              <>
                <span className="text-zinc-600 hidden sm:inline-block">/</span>
                <span className="text-zinc-200 font-semibold text-[15px]">{crumb}</span>
              </>
            )}
            {!crumb && (
               <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent sm:hidden">
                 Admin
               </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 [@media(hover:hover)]:hover:bg-zinc-900 [@media(hover:hover)]:hover:text-zinc-100 active:scale-90"
            aria-label="Voir le site"
          >
            <ExternalLink className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 [@media(hover:hover)]:hover:bg-red-500/10 [@media(hover:hover)]:hover:text-red-400 active:scale-90"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
