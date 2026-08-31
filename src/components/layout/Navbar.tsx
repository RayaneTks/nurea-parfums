"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";
import { ArrowLeft, Menu, Moon, SlidersHorizontal, Sun, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

/** Événement écouté par `CatalogSection` quand la barre n'a pas de rappel direct. */
export const OPEN_CATALOG_FILTERS_EVENT = "nurea:open-catalog-filters";

const NAV_LINKS = [
  { href: "/", label: "Catalogue" },
  { href: "/marque", label: "La Parfumerie" },
  { href: "/contact", label: "Contact" },
] as const;

interface NavbarProps {
  /** Accueil : ouvre le panneau de filtres. Par défaut, diffuse l'événement. */
  onOpenFilters?: () => void;
}

export const Navbar: FC<NavbarProps> = ({ onOpenFilters }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuWasOpen = useRef(false);

  const isHome = pathname === "/";
  const isDark = resolvedTheme !== "light";

  useEffect(() => setMounted(true), []);

  const openFilters = useCallback(() => {
    if (onOpenFilters) {
      onOpenFilters();
      return;
    }
    window.dispatchEvent(new CustomEvent(OPEN_CATALOG_FILTERS_EVENT));
  }, [onOpenFilters]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  /* Le focus revient au déclencheur à la fermeture, part dans le panneau à
     l'ouverture : sans cela le clavier repart du haut du document. */
  useEffect(() => {
    if (menuWasOpen.current && !menuOpen) menuButtonRef.current?.focus();
    menuWasOpen.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = requestAnimationFrame(() => {
      menuPanelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [menuOpen]);

  /* Verrou de défilement pendant le plein écran. */
  useEffect(() => {
    if (!menuOpen) return;
    const { documentElement, body } = document;
    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      documentElement.style.overflow = "";
      body.style.overflow = "";
    };
  }, [menuOpen]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key !== "Tab" || !menuPanelRef.current) return;

    const focusable = [
      ...menuPanelRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])"
      ),
    ];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-nurea-border bg-nurea-bg pt-[env(safe-area-inset-top,0px)]">
      <div className="nurea-page flex h-14 items-center justify-between md:h-[4.25rem]">
        {/* Retour ou menu — mobile seulement */}
        <div className="flex w-11 justify-start md:hidden">
          {isHome ? (
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              className="flex h-11 w-11 items-center justify-center text-nurea-muted transition-colors duration-nurea ease-out hover:text-nurea-text"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Retour"
              className="flex h-11 w-11 items-center justify-center border border-nurea-border text-nurea-text transition-colors duration-nurea ease-out hover:bg-nurea-surface-hover"
            >
              <ArrowLeft size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Logo — centré sur mobile, à gauche sur desktop */}
        <Link
          href="/"
          aria-label="Nuréa Parfums — accueil"
          className="absolute left-1/2 flex -translate-x-1/2 items-center md:static md:translate-x-0"
        >
          <BrandLogo priority className="h-[30px] md:h-9" />
        </Link>

        {/* Navigation desktop */}
        <div className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "nurea-label py-2 transition-colors duration-nurea ease-out",
                pathname === href
                  ? "text-nurea-accent"
                  : "text-nurea-subtle hover:text-nurea-text"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end md:w-auto">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              mounted && !isDark ? "Passer en thème sombre" : "Passer en thème clair"
            }
            className="flex h-11 w-11 items-center justify-center text-nurea-muted transition-colors duration-nurea ease-out hover:text-nurea-text"
          >
            {mounted && !isDark ? (
              <Moon size={18} strokeWidth={1.5} />
            ) : (
              <Sun size={18} strokeWidth={1.5} />
            )}
          </button>

          {isHome && (
            <button
              type="button"
              onClick={openFilters}
              aria-label="Filtrer le catalogue"
              className="flex h-11 items-center gap-2 px-2 text-nurea-muted transition-colors duration-nurea ease-out hover:text-nurea-text md:pr-0"
            >
              <SlidersHorizontal size={18} strokeWidth={1.5} />
              <span className="nurea-label hidden text-current md:inline">Filtrer</span>
            </button>
          )}
        </div>
      </div>

      {/* Menu plein écran — mobile */}
      {mounted &&
        createPortal(
          /* Même règle que le tiroir de filtres : fermé, le panneau sort de
             l'arbre d'accessibilité au lieu d'y rester en modale ouverte. */
          <div
            ref={menuPanelRef}
            onKeyDown={trapFocus}
            {...(menuOpen
              ? { role: "dialog", "aria-modal": true, "aria-label": "Menu principal" }
              : { inert: true, "aria-hidden": true })}
            className={cn(
              "fixed inset-0 z-[60] flex flex-col bg-nurea-bg pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] transition-opacity duration-nurea ease-out md:hidden",
              menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            <div className="flex h-14 items-center justify-between border-b border-nurea-border px-6">
              <span className="nurea-label text-nurea-subtle">Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Fermer le menu"
                className="-mr-3 flex h-11 w-11 items-center justify-center text-nurea-muted transition-colors duration-nurea ease-out hover:text-nurea-text"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center px-6">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  aria-current={pathname === href ? "page" : undefined}
                  className={cn(
                    "nurea-section-title border-b border-nurea-border py-6 transition-colors duration-nurea ease-out",
                    pathname === href ? "text-nurea-accent" : "text-nurea-text"
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-nurea-border px-6 py-4">
              <button
                type="button"
                onClick={toggleTheme}
                className="nurea-label flex h-11 items-center gap-2 text-nurea-subtle transition-colors duration-nurea ease-out hover:text-nurea-text"
              >
                {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
                {isDark ? "Thème clair" : "Thème sombre"}
              </button>
              <Image
                src="/branding/monogram/np-free-cuivre.webp"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7"
              />
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
};
