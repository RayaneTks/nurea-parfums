"use client";

import { useEffect, useId, useMemo, useRef, useState, type FC, type KeyboardEvent } from "react";
import { Check, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { useSheetMotion } from "@/hooks/useSheetMotion";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { cn } from "@/lib/utils";

interface CatalogFilterDrawerProps {
  open: boolean;
  brands: CatalogBrowseBrand[];
  selected: ReadonlySet<string>;
  /** Nombre de parfums que montrerait la grille avec ces marques (la recherche en cours tenue). */
  countFor: (slugs: ReadonlySet<string>) => number;
  onApply: (slugs: Set<string>) => void;
  onClose: () => void;
}

/**
 * Regroupe par initiale ; tout ce qui ne commence pas par une lettre tombe
 * en « # ».
 *
 * L'accent est retiré avant le test : « Élisabeth Arden » se cherche à la
 * lettre E, pas dans le groupe des caractères non alphabétiques.
 */
function initialOf(name: string): string {
  const first = name
    .trim()
    .charAt(0)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return /^[A-Z]$/.test(first) ? first : "#";
}

function groupByInitial(brands: CatalogBrowseBrand[]) {
  const groups = new Map<string, CatalogBrowseBrand[]>();

  for (const brand of [...brands].sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
    const key = initialOf(brand.name);
    groups.set(key, [...(groups.get(key) ?? []), brand]);
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
}

/**
 * Sélection de marques — feuille opaque par le bas sur téléphone, tiroir latéral au-delà.
 *
 * La sélection est un brouillon : elle n'agit sur la grille qu'à la validation, mais le bouton
 * annonce à chaque coche combien de parfums on verra (« Voir 12 parfums »). Fermer sans valider
 * ne change rien, ce qui rend l'exploration sans conséquence.
 *
 * Mouvement : `useSheetMotion` — la feuille suit le doigt par son en-tête, ou n'importe où quand la
 * liste est en haut, et sort par où elle est entrée. Le focus entre dans la feuille à l'ouverture,
 * y reste (Tab boucle) et revient au bouton d'origine à la fermeture.
 */
export const CatalogFilterDrawer: FC<CatalogFilterDrawerProps> = ({
  open,
  brands,
  selected,
  countFor,
  onApply,
  onClose,
}) => {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selected));
  const panelRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useSheetMotion({ open, onRequestClose: onClose, panelRef, scrimRef, scrollRef, desktop: "right" });

  /* Le brouillon repart de la sélection réelle à chaque ouverture. */
  useEffect(() => {
    if (open) setDraft(new Set(selected));
  }, [open, selected]);

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

  const groups = useMemo(() => groupByInitial(brands), [brands]);
  const count = countFor(draft);

  const toggle = (slug: string) => {
    setDraft((current) => {
      const next = new Set(current);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });
  };

  /* Tab boucle dans la feuille : derrière, la page est couverte pour la souris, pas pour le clavier. */
  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>("button, input");
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
          "fixed inset-0 z-scrim bg-[color-mix(in_oklch,var(--bg)_85%,transparent)] opacity-0",
          !open && "pointer-events-none"
        )}
      />

      {/* Fermé, le panneau reste monté pour garder sa transition — mais il perd
          son rôle de boîte modale. Un `role="dialog" aria-modal` permanent
          ferait croire aux lecteurs d'écran qu'une modale est toujours
          ouverte, et masquerait le reste de la page. */}
      <aside
        ref={panelRef}
        onKeyDown={trapFocus}
        {...(open
          ? { role: "dialog", "aria-modal": true, "aria-labelledby": titleId }
          : { inert: true, "aria-hidden": true })}
        className="fixed inset-x-0 bottom-0 z-sheet flex h-[78dvh] translate-y-full flex-col overflow-hidden rounded-t-sheet bg-surface-1 shadow-float will-change-transform md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-full md:max-w-[25rem] md:translate-x-full md:translate-y-0 md:rounded-none md:border-l md:border-line"
      >
        <header data-sheet-handle className="relative shrink-0 border-b border-line px-6 pb-4 pt-6">
          <span aria-hidden className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-fg-3 md:hidden" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="t-subtitle">Filtrer par marque</h2>
              <p className="t-caption mt-1">
                {draft.size === 0
                  ? "Toutes les marques"
                  : `${draft.size} marque${draft.size > 1 ? "s" : ""} cochée${draft.size > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer les filtres"
              className="press -mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
            >
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {groups.map(([initial, items]) => (
            <section key={initial} aria-label={initial === "#" ? "Autres" : `Lettre ${initial}`}>
              <h3 aria-hidden className="t-caption sticky top-0 z-10 bg-surface-1 px-6 pb-1 pt-4 text-fg-3">
                {initial}
              </h3>
              <ul>
                {items.map((brand) => {
                  const checked = draft.has(brand.slug);
                  return (
                    <li key={brand.id}>
                      <label className="flex min-h-12 cursor-pointer items-center gap-4 px-6 py-2 transition-colors duration-dur-2 ease-soft mouse-hover:bg-surface-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(brand.slug)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors duration-dur-1 ease-soft peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:[outline-color:var(--focus)]",
                            checked ? "border-fg-1 bg-fg-1 text-bg" : "border-fg-3"
                          )}
                        >
                          {checked && <Check size={14} strokeWidth={2.5} />}
                        </span>
                        <span className={cn("min-w-0 flex-1 truncate", checked ? "text-fg-1" : "text-fg-2")}>
                          {brand.name}
                        </span>
                        <span className="t-caption shrink-0 tabular-nums">
                          {brand.publishedCount} parfum{brand.publishedCount > 1 ? "s" : ""}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-line px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {draft.size > 0 && (
            <button type="button" onClick={() => setDraft(new Set())} className={buttonClass("link", "shrink-0 px-1")}>
              Tout décocher
            </button>
          )}
          {/* Le compte suit chaque coche : on sait ce qu'on verra avant de valider. */}
          <Button variant="solid" onClick={() => onApply(new Set(draft))} className="flex-1 whitespace-nowrap px-4">
            <span aria-live="polite">
              Voir {count} parfum{count > 1 ? "s" : ""}
            </span>
          </Button>
        </footer>
      </aside>
    </>
  );
};
