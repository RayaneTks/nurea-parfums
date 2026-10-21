"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type FC, type KeyboardEvent } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SnapchatIcon } from "@/components/ui/Icons";
import { useSheetMotion } from "@/hooks/useSheetMotion";
import { CONTACT } from "@/lib/data";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  links: readonly { href: string; label: string }[];
  isCurrent: (href: string) => boolean;
}

/**
 * Le menu de la vitrine sous 1024 px, où la barre haute n'a pas la place de ses quatre liens.
 *
 * Feuille par le bas sur téléphone (le contenu tombe sous le pouce), tiroir à droite sur tablette —
 * la même feuille que les filtres du catalogue (`useSheetMotion`, voile, focus piégé et rendu au
 * bouton d'origine, Échap). Les quatre pages en grand, la page en cours à la couleur de marque ;
 * dessous, le seul bouton plein : commander sur Snapchat, la raison d'être du site.
 *
 * Rendu hors de la barre haute : son `backdrop-filter` ferait de la barre le repère des éléments
 * `fixed`, et la feuille s'y retrouverait coincée.
 */
export const MobileMenu: FC<MobileMenuProps> = ({ open, onClose, links, isCurrent }) => {
  const panelRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useSheetMotion({ open, onRequestClose: onClose, panelRef, scrimRef, scrollRef, desktop: "right" });

  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previous = body.style.overflow;
    const opener = document.activeElement as HTMLElement | null;
    body.style.overflow = "hidden";
    /* Après la première image du ressort : avant, la feuille est encore `visibility: hidden`. */
    const frame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  /* Tab boucle dans la feuille. */
  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>("a, button");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <>
      <div
        ref={scrimRef}
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-scrim bg-[color-mix(in_oklch,var(--bg)_85%,transparent)] opacity-0 lg:hidden",
          !open && "pointer-events-none"
        )}
      />

      {/* Fermé, le panneau reste monté pour sa transition, sans rôle de boîte modale (voir CatalogFilterDrawer). */}
      <aside
        ref={panelRef}
        id="menu-vitrine"
        onKeyDown={trapFocus}
        {...(open
          ? { role: "dialog", "aria-modal": true, "aria-labelledby": titleId }
          : { inert: true, "aria-hidden": true })}
        className="fixed inset-x-0 bottom-0 z-sheet flex max-h-[85dvh] translate-y-full flex-col overflow-hidden rounded-t-sheet bg-surface-1 shadow-float will-change-transform md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-full md:max-w-[25rem] md:translate-x-full md:translate-y-0 md:rounded-none md:border-l md:border-line lg:hidden"
      >
        <header data-sheet-handle className="relative shrink-0 px-6 pb-2 pt-6">
          <span aria-hidden className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-fg-3 md:hidden" />
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="t-subtitle">
              Menu
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer le menu"
              className="press -mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
            >
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <nav aria-label="Navigation principale">
            <ul className="px-6">
              {links.map(({ href, label }) => {
                const current = isCurrent(href);
                return (
                  <li key={href} className="border-b border-line last:border-b-0">
                    <Link
                      href={href}
                      onClick={onClose}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "t-title flex min-h-16 items-center transition-colors duration-dur-2 ease-soft",
                        current ? "text-accent" : "mouse-hover:text-accent"
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <footer className="shrink-0 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <a
            href={CONTACT.snapchat}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("solid", "w-full")}
          >
            <SnapchatIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            Commander sur Snapchat
          </a>
        </footer>
      </aside>
    </>
  );
};
