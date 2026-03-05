"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState, type FC } from "react";

interface NavbarProps {
  scrolled: boolean;
  onOpenFilters?: () => void;
}

export const Navbar: FC<NavbarProps> = ({ scrolled, onOpenFilters }) => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isHome = pathname === "/";
  const isContact = pathname === "/contact";
  const isDark = resolvedTheme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <nav
      className={`fixed top-0 w-full z-40 transition-all duration-500 ${
        scrolled
          ? "bg-[#FDFCF8]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md py-4 shadow-sm"
          : "bg-transparent py-6"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 md:px-12">
        <button className="md:hidden" aria-label="Ouvrir le menu">
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
    </nav>
  );
};
