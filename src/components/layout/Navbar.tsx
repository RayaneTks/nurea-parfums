"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState, type FC } from "react";

interface NavbarProps {
  scrolled: boolean;
  onOpenFilters?: () => void;
}

export const Navbar: FC<NavbarProps> = ({ scrolled, onOpenFilters }) => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const isHome = pathname === "/";
  const isContact = pathname === "/contact";
  const isDark = resolvedTheme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (menuOpen) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <nav
      className={`fixed top-0 w-full z-40 transition-all duration-500 ${
        scrolled
          ? "bg-[#FDFCF8]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md py-4 shadow-sm"
          : "bg-transparent py-6"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 md:px-12">
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} className="text-[#111111] dark:text-[#FDFCF8]" />
        </button>

        <Link
          href="/"
          className="font-serif text-2xl font-semibold tracking-widest uppercase text-center md:static md:translate-x-0 absolute left-1/2 -translate-x-1/2 cursor-pointer"
        >
          Nurea
        </Link>

        <div className="hidden items-center gap-10 text-xs uppercase tracking-[0.2em] md:flex">
          <Link
            href="/"
            className={`relative transition-colors after:absolute after:-bottom-2 after:left-0 after:h-[1px] after:w-full after:bg-[#111111] after:transition-transform after:duration-300 dark:after:bg-[#FDFCF8] ${
              isHome
                ? "text-[#8C7A6B] dark:text-[#C29B62] after:scale-x-100"
                : "text-[#111111] dark:text-[#FDFCF8] after:scale-x-0 hover:text-[#8C7A6B] hover:after:scale-x-100 dark:hover:text-[#C29B62]"
            }`}
          >
            La Collection
          </Link>
          <Link
            href="/contact"
            className={`relative transition-colors after:absolute after:-bottom-2 after:left-0 after:h-[1px] after:w-full after:bg-[#111111] after:transition-transform after:duration-300 dark:after:bg-[#FDFCF8] ${
              isContact
                ? "text-[#8C7A6B] dark:text-[#C29B62] after:scale-x-100"
                : "text-[#111111] dark:text-[#FDFCF8] after:scale-x-0 hover:text-[#8C7A6B] hover:after:scale-x-100 dark:hover:text-[#C29B62]"
            }`}
          >
            Contact Privé
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleTheme}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-transparent transition-all hover:border-[#111111] dark:hover:border-[#FDFCF8] md:flex"
            aria-label="Basculer le thème"
          >
            {mounted ? (
              isDark ? (
                <Sun size={14} />
              ) : (
                <Moon size={14} />
              )
            ) : (
              <span className="h-[14px] w-[14px]" aria-hidden />
            )}
          </button>

          {isHome && onOpenFilters && (
            <>
              <button
                onClick={onOpenFilters}
                className="flex items-center gap-2 md:hidden"
                aria-label="Ouvrir la recherche"
              >
                <Search size={20} />
              </button>
              <div className="hidden items-center gap-6 md:flex">
                <button
                  onClick={onOpenFilters}
                  className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] transition-colors hover:text-[#8C7A6B] dark:hover:text-[#C29B62]"
                >
                  <Search size={14} /> Recherche
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Menu burger mobile (panneau gauche) - z-[100] au-dessus de la nav pour éviter les conflits en scroll */}
      <>
        <button
          type="button"
          onClick={closeMenu}
          className={`fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 md:hidden ${
            menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          aria-label="Fermer le menu"
        />
        <div
          className={`fixed left-0 top-0 z-[110] flex h-full w-[min(280px,85vw)] flex-col gap-8 border-r border-[#111111]/10 bg-[#FDFCF8] px-6 py-8 shadow-xl transition-transform duration-300 ease-out dark:border-[#FDFCF8]/10 dark:bg-[#0A0A0A] md:hidden ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-label="Menu principal"
        >
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg font-semibold tracking-widest uppercase text-[#111111] dark:text-[#FDFCF8]">
                Menu
              </span>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-full p-2 transition-colors hover:bg-[#111111]/10 dark:hover:bg-[#FDFCF8]/10"
                aria-label="Fermer le menu"
              >
                <X size={20} className="text-[#111111] dark:text-[#FDFCF8]" />
              </button>
            </div>
            <nav className="flex flex-col gap-6">
              <Link
                href="/"
                onClick={closeMenu}
                className={`text-sm uppercase tracking-[0.2em] ${
                  isHome
                    ? "font-medium text-[#8C7A6B] dark:text-[#C29B62]"
                    : "text-[#111111] dark:text-[#FDFCF8]"
                }`}
              >
                La Collection
              </Link>
              <Link
                href="/contact"
                onClick={closeMenu}
                className={`text-sm uppercase tracking-[0.2em] ${
                  isContact
                    ? "font-medium text-[#8C7A6B] dark:text-[#C29B62]"
                    : "text-[#111111] dark:text-[#FDFCF8]"
                }`}
              >
                Contact Privé
              </Link>
            </nav>
            <div className="mt-auto border-t border-[#111111]/10 pt-6 dark:border-[#FDFCF8]/10">
              <p className="mb-3 text-xs uppercase tracking-widest text-[#888888] dark:text-[#A0A0A0]">
                Thème
              </p>
              <button
                type="button"
                onClick={handleToggleTheme}
                className="flex h-10 w-full items-center gap-3 rounded-lg border border-[#111111]/20 px-4 transition-colors hover:bg-[#111111]/5 dark:border-[#FDFCF8]/20 dark:hover:bg-[#FDFCF8]/5"
                aria-label="Basculer le thème"
              >
                {mounted ? (
                  isDark ? (
                    <>
                      <Sun size={18} className="text-[#111111] dark:text-[#FDFCF8]" />
                      <span className="text-sm text-[#111111] dark:text-[#FDFCF8]">Mode clair</span>
                    </>
                  ) : (
                    <>
                      <Moon size={18} className="text-[#111111] dark:text-[#FDFCF8]" />
                      <span className="text-sm text-[#111111] dark:text-[#FDFCF8]">Mode sombre</span>
                    </>
                  )
                ) : (
                  <span className="h-[18px] w-[18px]" aria-hidden />
                )}
              </button>
            </div>
          </div>
      </>
    </nav>
  );
};
