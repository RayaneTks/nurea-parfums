"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { cn } from "@/lib/utils";

interface CatalogFilterDrawerProps {
  open: boolean;
  brands: CatalogBrowseBrand[];
  selected: ReadonlySet<string>;
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
 * Sélection de marques — feuille par le bas sur mobile, tiroir latéral au-delà.
 *
 * La sélection est un brouillon : elle n'agit sur la grille qu'à la validation.
 * Fermer sans valider ne change donc rien, ce qui rend l'exploration sans
 * conséquence.
 */
export const CatalogFilterDrawer: FC<CatalogFilterDrawerProps> = ({
  open,
  brands,
  selected,
  onApply,
  onClose,
}) => {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selected));
  const touchStartY = useRef<number | null>(null);

  /* Le brouillon repart de la sélection réelle à chaque ouverture. */
  useEffect(() => {
    if (open) setDraft(new Set(selected));
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const groups = useMemo(() => groupByInitial(brands), [brands]);

  const toggle = (slug: string) => {
    setDraft((current) => {
      const next = new Set(current);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });
  };

  const onTouchStart = (event: ReactTouchEvent) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event: ReactTouchEvent) => {
    const start = touchStartY.current;
    const end = event.changedTouches[0]?.clientY;
    touchStartY.current = null;
    if (start !== null && end !== undefined && end - start > 60) onClose();
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[110] bg-nurea-bg/85 transition-opacity duration-nurea ease-out",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Fermé, le panneau reste monté pour garder sa transition — mais il perd
          son rôle de boîte modale. Un `role="dialog" aria-modal` permanent
          ferait croire aux lecteurs d'écran qu'une modale est toujours
          ouverte, et masquerait le reste de la page. */}
      <aside
        {...(open
          ? { role: "dialog", "aria-modal": true, "aria-label": "Filtrer par marques" }
          : { inert: true, "aria-hidden": true })}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[120] flex h-[78dvh] flex-col border-t border-nurea-border bg-nurea-bg transition-transform duration-300 ease-out",
          "md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-full md:max-w-[25rem] md:border-l md:border-t-0",
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"
        )}
      >
        <header
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="flex shrink-0 items-center justify-between border-b border-nurea-border px-6 py-4"
        >
          <div>
            <h2 className="nurea-name text-nurea-text">Filtrer par marque</h2>
            <p className="nurea-caption mt-1">
              {draft.size === 0
                ? "Toutes les marques"
                : `${draft.size} sélectionnée${draft.size > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les filtres"
            className="-mr-3 flex h-11 w-11 items-center justify-center text-nurea-muted transition-colors duration-nurea ease-out hover:text-nurea-text"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </header>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {groups.length === 0 ? (
            <p className="nurea-caption px-6 py-12 text-center">
              Aucune marque disponible.
            </p>
          ) : (
            groups.map(([initial, items]) => (
              <section key={initial}>
                <h3 className="nurea-label sticky top-0 z-10 border-b border-nurea-border bg-nurea-bg px-6 py-2">
                  {initial}
                </h3>
                <ul>
                  {items.map((brand) => {
                    const checked = draft.has(brand.slug);
                    return (
                      <li key={brand.id} className="border-b border-nurea-border">
                        <label className="flex min-h-[3.5rem] cursor-pointer items-center gap-4 px-6 py-3 transition-colors duration-nurea ease-out hover:bg-nurea-surface-hover">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(brand.slug)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-nurea ease-out peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-nurea-accent",
                              checked
                                ? "border-nurea-accent bg-nurea-accent text-nurea-on-accent"
                                : "border-nurea-border-strong"
                            )}
                          >
                            {checked && <Check size={13} strokeWidth={3} />}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-sm transition-colors duration-nurea ease-out",
                              checked ? "text-nurea-text" : "text-nurea-muted"
                            )}
                          >
                            {brand.name}
                          </span>
                          <span className="nurea-caption shrink-0 tabular-nums">
                            {brand.assortment === "COMPLETE"
                              ? "Gamme"
                              : brand.publishedCount}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <footer className="shrink-0 border-t border-nurea-border p-6 pb-safe">
          <div className="mb-4 flex items-center justify-between">
            <span className="nurea-caption">
              {draft.size === 0
                ? "Aucun filtre"
                : `${draft.size} marque${draft.size > 1 ? "s" : ""}`}
            </span>
            {draft.size > 0 && (
              <button
                type="button"
                onClick={() => setDraft(new Set())}
                className="nurea-label h-11 transition-colors duration-nurea ease-out hover:text-nurea-text"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <Button
            variant="solid"
            onClick={() => onApply(new Set(draft))}
            className="w-full"
          >
            Afficher les résultats
          </Button>
        </footer>
      </aside>
    </>
  );
};
