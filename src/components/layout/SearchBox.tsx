"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FC, type KeyboardEvent, type MouseEvent } from "react";
import { PerfumeImage } from "@/components/features/PerfumeImage";
import { requestSheet } from "@/components/features/openPerfume";
import { useExtendedSearch } from "@/components/home/useExtendedSearch";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { suggestionsForQuery, suggestionsFromResponse, type SearchSuggestions } from "@/lib/search/suggestions";
import { cn } from "@/lib/utils";
import { MIN_LIVE_QUERY, QUERY_SYNC_EVENT, SEARCH_EVENT, SHOW_RESULTS_EVENT } from "./searchEvents";

/** Une rangée du panneau : un parfum, « Voir les N parfums », ou l'invitation à écrire. */
type Row =
  | { kind: "perfume"; key: string; href: string; suggestion: SearchSuggestions["perfumes"][number] }
  | { kind: "all"; key: string; href: string; total: number }
  | { kind: "ask"; key: string; href: string; ask: NonNullable<SearchSuggestions["ask"]> };

const DEBOUNCE_MS = 300;

/** Un clic simple ouvre sans naviguer ; un clic modifié (nouvel onglet, bouton du milieu) laisse le lien faire. */
function plainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Le champ de recherche de la barre haute et ses suggestions.
 *
 * Dès deux caractères, un panneau sous le champ propose jusqu'à cinq parfums du catalogue (visuel,
 * marque, nom), puis « Voir les N parfums » ; quand rien ne répond, « Vous cherchez *X* ? Écrivez-nous »
 * — la même chaîne que la grille vide, jamais le vide. Une rangée est un vrai lien (page du parfum,
 * grille filtrée, contact) ; sur l'accueil, un clic simple ouvre la feuille sans recharger
 * (`requestSheet`) et la grille reste filtrée derrière (`SEARCH_EVENT`).
 *
 * Clavier (motif « combobox » WAI-ARIA) : flèches pour parcourir, Entrée ouvre la rangée active —
 * sans rangée active, Entrée vaut « Rechercher » —, Échap referme ; le lecteur d'écran est tenu au
 * courant par `aria-activedescendant` et une annonce discrète.
 */
export const SearchBox: FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const live = query.trim().length >= MIN_LIVE_QUERY;
  const search = useExtendedSearch(query, open && live, { minLength: MIN_LIVE_QUERY, debounceMs: DEBOUNCE_MS });

  /* Pendant qu'une réponse arrive, les rangées de la précédente restent : rien ne clignote. */
  const [shown, setShown] = useState<SearchSuggestions | null>(null);
  useEffect(() => {
    if (search.status === "done") setShown(suggestionsFromResponse(search.response, query));
    else if (search.status === "error") setShown(suggestionsForQuery(query));
    else if (search.status === "idle") setShown(null);
    // `query` ne sert qu'à nommer la saisie ; la réponse, elle, suit sa propre requête.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const rows = useMemo<Row[]>(() => {
    if (!shown) return [];
    const list: Row[] = shown.perfumes.map((suggestion) => ({ kind: "perfume", key: `p-${suggestion.id}`, href: suggestion.href, suggestion }));
    if (shown.total > 0) list.push({ kind: "all", key: "all", href: `/?q=${encodeURIComponent(query.trim())}`, total: shown.total });
    if (shown.ask) list.push({ kind: "ask", key: "ask", href: shown.ask.href, ask: shown.ask });
    return list;
  }, [shown, query]);

  const expanded = open && live && rows.length > 0;

  /* Arrivée sur l'accueil avec `?q=` : le champ montre ce que la grille filtre. Changer de page referme. */
  useEffect(() => {
    if (onHome) setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    setOpen(false);
  }, [onHome, pathname]);

  /* Le catalogue a changé la requête sans nous : on suit, sauf pendant la frappe. */
  useEffect(() => {
    const sync = (event: Event) => {
      if (document.activeElement === inputRef.current) return;
      setQuery((event as CustomEvent<string>).detail);
    };
    window.addEventListener(QUERY_SYNC_EVENT, sync);
    return () => window.removeEventListener(QUERY_SYNC_EVENT, sync);
  }, []);

  /* La liste change : plus de rangée active (elle visait l'ancienne). */
  useEffect(() => setActive(-1), [rows]);

  const broadcast = (value: string) => {
    if (!onHome) return;
    window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: value.trim().length >= MIN_LIVE_QUERY ? value : "" }));
  };

  /** Recherche validée : le catalogue viendra en vue, une fois le clavier refermé. */
  const showResults = () => {
    if (!onHome || query.trim().length < MIN_LIVE_QUERY) return;
    window.dispatchEvent(new CustomEvent(SHOW_RESULTS_EVENT));
  };

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  /** Ouvre la rangée : la feuille sur l'accueil, sinon la page visée. */
  const activate = (row: Row) => {
    close();
    inputRef.current?.blur();
    if (row.kind === "perfume" && onHome) {
      requestSheet(row.suggestion.id);
      return;
    }
    if (row.kind === "all" && onHome) {
      broadcast(query);
      showResults();
      return;
    }
    router.push(row.href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (expanded) {
        event.preventDefault();
        close();
      }
      return;
    }
    if (!expanded) {
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && live) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      /* Du champ (-1) à la dernière rangée, en boucle dans les deux sens. */
      setActive((current) => {
        const next = current + step;
        if (next < -1) return rows.length - 1;
        if (next >= rows.length) return -1;
        return next;
      });
      return;
    }
    if (event.key === "Enter" && active >= 0 && rows[active]) {
      event.preventDefault();
      activate(rows[active]);
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <form
      action="/"
      method="get"
      role="search"
      onSubmit={(event) => {
        if (!onHome) return;
        /* Déjà filtrée en direct : « Rechercher » referme seulement le clavier et les suggestions. */
        event.preventDefault();
        broadcast(query);
        close();
        inputRef.current?.blur();
        showResults();
      }}
      className="relative order-last mb-3 basis-full md:order-none md:mb-0 md:ml-auto md:max-w-sm md:flex-1 md:basis-auto"
    >
      <label className="relative block">
        <span className="sr-only">Rechercher un parfum ou une marque</span>
        <Search
          size={18}
          strokeWidth={1.5}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3"
        />
        <input
          type="search"
          name="q"
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            broadcast(event.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Parfum, marque…"
          className="h-11 w-full rounded-md border border-line bg-surface-1 pl-10 pr-3 text-fg-1 transition-colors duration-dur-2 ease-soft placeholder:text-fg-3 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </label>

      {/* Le panneau garde le focus dans le champ : appuyer dedans ne le ferme pas (`onBlur`). */}
      {expanded && shown ? (
        <div
          onMouseDown={(event) => event.preventDefault()}
          className="suggestions absolute inset-x-0 top-[calc(100%+var(--space-2))] z-10 max-h-[min(26rem,60dvh)] overflow-y-auto rounded-lg border border-line bg-surface-1 p-1"
        >
          <p className="sr-only" aria-live="polite">
            {shown.total > 0
              ? `${shown.total} parfum${shown.total > 1 ? "s" : ""} trouvé${shown.total > 1 ? "s" : ""}`
              : "Aucun parfum du catalogue ne correspond : écrivez-nous."}
          </p>
          <ul id={listId} role="listbox" aria-label="Suggestions" aria-busy={search.status === "loading"}>
            {rows.map((row, index) => (
              /* L'option EST le lien (rôle permis sur `a[href]`) : pas d'élément interactif dans un autre. */
              <li key={row.key} role="presentation">
                <a
                  href={row.href}
                  tabIndex={-1}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  /* Nom lu : « Marque — Nom », sans la légende du visuel (qui, lue avant, noyait le nom). */
                  aria-label={row.kind === "perfume" ? `${brandLineLabel(row.suggestion.brand, row.suggestion.line)} — ${row.suggestion.name}` : undefined}
                  onMouseEnter={() => setActive(index)}
                  onClick={(event) => {
                    if (!plainClick(event)) return;
                    event.preventDefault();
                    activate(row);
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-dur-1 ease-soft",
                    index === active && "bg-surface-2"
                  )}
                >
                  {row.kind === "perfume" ? (
                    <>
                      <span className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                        <PerfumeImage perfume={row.suggestion} sizes="36px" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="t-caption truncate text-fg-2">{brandLineLabel(row.suggestion.brand, row.suggestion.line)}</span>
                        <span className="t-body truncate text-fg-1">{row.suggestion.name}</span>
                      </span>
                    </>
                  ) : row.kind === "all" ? (
                    <span className="t-body text-fg-1">
                      Voir {row.total > 1 ? `les ${row.total} parfums` : "le parfum"}
                    </span>
                  ) : (
                    <span className="t-body text-fg-1 [overflow-wrap:anywhere]">
                      {row.ask.brandOnly ? (
                        <>Vous cherchez un parfum <em>{row.ask.brand}</em> ?</>
                      ) : row.ask.brand ? (
                        <>Vous cherchez <em>{row.ask.name}</em> de <em>{row.ask.brand}</em> ?</>
                      ) : (
                        <>Vous cherchez <em>{row.ask.name}</em> ?</>
                      )}{" "}
                      <span className="text-accent">Écrivez-nous</span>
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
};
