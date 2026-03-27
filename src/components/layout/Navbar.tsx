"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { Filter, Menu, Moon, Search, Sun, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

interface NavbarProps {
  scrolled: boolean;
  /** Accueil : ouvre le panneau « Explorer » (tiroir à droite). */
  onOpenBrowse?: () => void;
}

export const Navbar: FC<NavbarProps> = ({ scrolled, onOpenBrowse }) => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const prevMenuOpen = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (prevMenuOpen.current && !menuOpen) {
      menuButtonRef.current?.focus();
    }
    prevMenuOpen.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const id = window.requestAnimationFrame(() => {
      menuPanelRef.current
        ?.querySelector<HTMLElement>("button, a")
        ?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [menuOpen]);

  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeMenu();
      return;
    }
    if (e.key !== "Tab" || !menuPanelRef.current) return;
    const list = [
      ...menuPanelRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])"
      ),
    ];
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const isHome = pathname === "/";
  const isContact = pathname === "/contact";
  const isMarque = pathname === "/marque";
  const isDark = resolvedTheme !== "light";

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
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)] transition-all duration-500 ease-out-expo [transform:translateZ(0)] border-b ${
        scrolled
          ? "border-[var(--nurea-border)] bg-[var(--nurea-overlay)] backdrop-blur-2xl"
          : "border-[var(--nurea-border)]/0 bg-[var(--nurea-bg)]"
      }`}
    >
      <div className="relative z-10 mx-auto flex min-h-[58px] max-w-[1200px] items-center justify-between px-4 md:min-h-[68px] md:px-10">
        {/* Burger — mobile only */}
        <button
          ref={menuButtonRef}
          type="button"
          className="md:hidden -ml-1 flex h-11 w-11 shrink-0 items-center justify-center text-[var(--nurea-text-muted)] transition-all hover:text-[var(--nurea-text)] active:scale-95"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>

        {/* Logo — dimensions affichées plus grandes (marges transparentes dans le fichier) */}
        <Link
          href="/"
          className="absolute left-1/2 flex -translate-x-1/2 items-center md:static md:translate-x-0"
        >
          {mounted ? (
            <Image
              src={logoSrc}
              alt="Nurea Parfums"
              width={260}
              height={72}
              className="h-[54px] w-auto md:h-[62px]"
              priority
            />
          ) : (
            <span className="font-serif text-lg tracking-[0.2em] text-[var(--nurea-text)]">
              NUREA
            </span>
          )}
        </Link>

        {/* Nav desktop */}
        <div className="hidden items-center gap-8 text-[12px] uppercase tracking-[0.2em] font-medium md:flex lg:gap-10">
          <Link
            href="/"
            className={`py-2 transition-colors duration-300 ${
              isHome
                ? "text-[var(--nurea-accent)]"
                : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
            }`}
          >
            Collection
          </Link>
          <Link
            href="/marque"
            className={`py-2 transition-colors duration-300 ${
              isMarque
                ? "text-[var(--nurea-accent)]"
                : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
            }`}
          >
            Marque
          </Link>
          <Link
            href="/contact"
            className={`py-2 transition-colors duration-300 ${
              isContact
                ? "text-[var(--nurea-accent)]"
                : "text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
            }`}
          >
            Contact
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Theme toggle — desktop only */}
          <button
            type="button"
            onClick={toggleTheme}
            className="relative hidden h-11 w-11 items-center justify-center text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-text)] md:flex"
            aria-label="Basculer le thème"
          >
            {mounted ? (
              isDark ? (
                <Sun size={18} strokeWidth={1.5} />
              ) : (
                <Moon size={18} strokeWidth={1.5} />
              )
            ) : (
              <span className="h-[18px] w-[18px]" />
            )}
          </button>

          {/* Search trigger */}
          {isHome && onOpenBrowse && (
            <button
              type="button"
              onClick={onOpenBrowse}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center text-[var(--nurea-text-muted)] transition-all hover:text-[var(--nurea-text)] active:scale-95 md:h-auto md:w-auto md:rounded-none md:py-2.5 md:pl-2 md:pr-3"
              aria-label="Filtrer le catalogue"
            >
              <Filter size={20} strokeWidth={1.5} className="md:hidden" />
              <span className="hidden items-center gap-2 text-[12px] uppercase tracking-[0.15em] md:flex">
                <Filter size={15} strokeWidth={1.5} />
                Filtrer
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
              ref={menuPanelRef}
              onKeyDown={handleMenuKeyDown}
              className={`fixed inset-0 z-[61] flex flex-col bg-[var(--nurea-bg)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] transition-all duration-500 ease-out-expo md:hidden ${
                menuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-full pointer-events-none"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
              aria-hidden={!menuOpen}
              {...(!menuOpen ? { inert: true as unknown as boolean } : {})}
            >
              {/* Header */}
              <div className="flex min-h-[58px] items-center justify-between px-5">
                <span className="text-[12px] font-medium uppercase tracking-[0.35em] text-[var(--nurea-text-muted)]">
                  Menu
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-11 w-11 items-center justify-center text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-text)]"
                    aria-label="Basculer le thème"
                  >
                    {mounted &&
                      (isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />)}
                  </button>
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="flex h-11 w-11 items-center justify-center text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-text)]"
                    aria-label="Fermer"
                  >
                    <X size={22} strokeWidth={1.5} />
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
                  href="/marque"
                  onClick={closeMenu}
                  className={`font-serif text-[32px] transition-colors active:scale-95 ${
                    isMarque
                      ? "text-[var(--nurea-accent)]"
                      : "text-[var(--nurea-text)]"
                  }`}
                >
                  Notre marque
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
                {isHome && onOpenBrowse && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenBrowse();
                    }}
                    className="flex items-center gap-2.5 text-[13px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-text)] active:scale-95"
                  >
                    <Filter size={16} strokeWidth={1.5} />
                    Filtrer le catalogue
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
