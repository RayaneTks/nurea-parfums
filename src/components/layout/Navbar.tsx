"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState, type FC } from "react";

interface NavbarProps {
  scrolled: boolean;
  onOpenSearch?: () => void;
}

export const Navbar: FC<NavbarProps> = ({ scrolled, onOpenSearch }) => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const isHome = pathname === "/";
  const isContact = pathname === "/contact";
  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const closeMenu = () => setMenuOpen(false);

  /* Lock scroll when menu is open */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  const logoSrc = isDark
    ? "/branding/logos/nurea-logo-horizontal-dark.png"
    : "/branding/logos/nurea-logo-horizontal-light.png";

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-out-expo ${
        scrolled
          ? "backdrop-blur-2xl py-2.5 border-b border-[var(--nurea-border)]"
          : "bg-transparent py-4 md:py-5"
      }`}
      style={scrolled ? { backgroundColor: "var(--nurea-overlay)" } : undefined}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 md:px-10">
        {/* Burger — mobile only */}
        <button
          className="md:hidden flex items-center justify-center h-10 w-10 -ml-2 text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)] active:scale-95 transition-all"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        {/* Logo */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
        >
          {mounted ? (
            <Image
              src={logoSrc}
              alt="Nurea Parfums"
              width={160}
              height={44}
              className="h-11 w-auto md:h-14"
              priority
            />
          ) : (
            <span className="font-serif text-base tracking-[0.2em] text-[var(--nurea-text)]">
              NUREA
            </span>
          )}
        </Link>

        {/* Nav desktop */}
        <div className="hidden items-center gap-10 text-[11px] uppercase tracking-[0.2em] font-medium md:flex">
          <Link
            href="/"
            className={`py-1.5 transition-colors duration-300 ${
              isHome
                ? "text-[var(--nurea-accent)]"
                : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
            }`}
          >
            Collection
          </Link>
          <Link
            href="/contact"
            className={`py-1.5 transition-colors duration-300 ${
              isContact
                ? "text-[var(--nurea-accent)]"
                : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
            }`}
          >
            Contact
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle — desktop only */}
          <button
            onClick={toggleTheme}
            className="relative hidden h-10 w-10 items-center justify-center text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)] transition-colors md:flex"
            aria-label="Basculer le theme"
          >
            {mounted ? (
              isDark ? (
                <Sun size={17} strokeWidth={1.5} />
              ) : (
                <Moon size={17} strokeWidth={1.5} />
              )
            ) : (
              <span className="h-[17px] w-[17px]" />
            )}
          </button>

          {/* Search trigger */}
          {isHome && onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="relative flex items-center justify-center h-10 w-10 md:w-auto md:h-auto md:py-2 md:pl-2 md:pr-3 text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)] active:scale-95 transition-all"
              aria-label="Rechercher"
            >
              <Search size={18} strokeWidth={1.5} className="md:hidden" />
              <span className="hidden md:flex items-center gap-2 text-[11px] uppercase tracking-[0.15em]">
                <Search size={14} strokeWidth={1.5} />
                Recherche
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile menu (portal) ── */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-400 md:hidden ${
                menuOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Full-screen panel */}
            <div
              className={`fixed inset-0 z-[61] flex flex-col bg-[var(--nurea-bg)] transition-all duration-500 ease-out-expo md:hidden ${
                menuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-full pointer-events-none"
              }`}
              role="dialog"
              aria-label="Menu principal"
              aria-hidden={!menuOpen}
              {...(!menuOpen ? { inert: true as unknown as boolean } : {})}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-[11px] uppercase tracking-[0.35em] text-[var(--nurea-text-muted)]">
                  Menu
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center h-10 w-10 text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)] transition-colors"
                    aria-label="Basculer le theme"
                  >
                    {mounted &&
                      (isDark ? <Sun size={17} strokeWidth={1.5} /> : <Moon size={17} strokeWidth={1.5} />)}
                  </button>
                  <button
                    onClick={closeMenu}
                    className="flex items-center justify-center h-10 w-10 text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)] transition-colors"
                    aria-label="Fermer"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Links */}
              <nav className="flex flex-col items-center justify-center flex-1 gap-10">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className={`font-serif text-[32px] transition-colors active:scale-95 ${
                    isHome
                      ? "text-[var(--nurea-accent)]"
                      : "text-[var(--nurea-text)]"
                  }`}
                >
                  La Collection
                </Link>
                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className={`font-serif text-[32px] transition-colors active:scale-95 ${
                    isContact
                      ? "text-[var(--nurea-accent)]"
                      : "text-[var(--nurea-text)]"
                  }`}
                >
                  Contact
                </Link>
                {isHome && onOpenSearch && (
                  <button
                    onClick={() => { closeMenu(); onOpenSearch(); }}
                    className="flex items-center gap-2.5 text-[13px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)] transition-colors active:scale-95"
                  >
                    <Search size={16} strokeWidth={1.5} />
                    Recherche
                  </button>
                )}
              </nav>

              {/* Footer */}
              <div className="flex items-center justify-center px-5 py-5 border-t border-[var(--nurea-border)]">
                <Image
                  src={isDark ? "/branding/monogram/np-free-cuivre.png" : "/branding/monogram/np-free-bordeaux.png"}
                  alt=""
                  width={36}
                  height={36}
                  className="opacity-30"
                />
              </div>
            </div>
          </>,
          document.body
        )}
    </nav>
  );
};
