"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { EmptyState } from "../primitives/EmptyState";
import { ListRow } from "../primitives/ListRow";
import { SearchField } from "../primitives/SearchField";
import { Sheet } from "../primitives/Sheet";
import { SkeletonList } from "../primitives/Skeleton";
import { WindowedList } from "../primitives/WindowedList";
import { ErrorBanner } from "./ErrorBanner";
import { filterOptions } from "./select-search";

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
  description?: string;
  /** Termes cherchables non affichés (téléphone normalisé, Snap, marque). */
  keywords?: readonly string[];
  leading?: ReactNode;
  /** Un badge au plus (« Rupture », « Au ticket ×2 »). */
  trailing?: ReactNode;
  disabled?: boolean;
};

export type SelectCreateContext<V extends string> = {
  /** Saisie en cours, pour pré-remplir le formulaire. */
  query: string;
  /** Pose la valeur créée et ferme la sheet. */
  select: (value: V) => void;
  /** Revient à la liste. */
  cancel: () => void;
};

type SelectSheetProps<V extends string> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: readonly SelectOption<V>[];
  value?: V | null;
  /** Tap sur une option : la sheet se ferme. */
  onSelect: (value: V) => void;
  /** Avant toute saisie, en tête : « Vendus récemment » (02 N7). Valeurs de `options`. */
  recent?: readonly V[];
  recentTitle?: string;
  /** Liste complète avant saisie. Défaut : seulement sans `recent` (lots, poches). */
  listAllBeforeSearch?: boolean;
  /** Rangée fixe au-dessus des résultats : « Client de passage », « Sans lot ». */
  header?: ReactNode;
  searchPlaceholder?: string;
  /** Focus du champ à l'ouverture (« Rechercher un parfum »). */
  autoFocusSearch?: boolean;
  /** Saisie contrôlée : conservée d'une ouverture à l'autre (06 S05). */
  query?: string;
  onQueryChange?: (query: string) => void;
  /**
   * Création inline, SANS quitter le formulaire en cours : la rangée « Créer
   * « Fares B. » » en pied de résultats ouvre `form` dans la même sheet.
   */
  onCreate?: {
    label: (query: string) => string;
    form: (ctx: SelectCreateContext<V>) => ReactNode;
  };
  /** Vide : titre (fonction de la saisie pour un vide de filtre) ; la création y est proposée. */
  empty: { title: string | ((query: string) => string); description?: string };
  loading?: boolean;
  error?: { message: string; onRetry: () => void } | null;
  /** Ouvert depuis une autre sheet. */
  nested?: boolean;
};

/** Au-delà, la liste est fenêtrée (catalogue, clients). */
const WINDOW_THRESHOLD = 48;

/**
 * LE sélecteur de données métier (05 §3.2) : combobox plein écran en sheet.
 * Généralise l'ancien `CustomerField` — client, parfum, marque, poche, lot en
 * sont des spécialisations dans leurs features. Jamais un `<select>` natif pour
 * une donnée métier.
 */
export function SelectSheet<V extends string>({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
  recent,
  recentTitle = "Récents",
  listAllBeforeSearch,
  header,
  searchPlaceholder = "Rechercher…",
  autoFocusSearch = false,
  query: controlledQuery,
  onQueryChange,
  onCreate,
  empty,
  loading = false,
  error,
  nested = false,
}: SelectSheetProps<V>) {
  const [ownQuery, setOwnQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const query = controlledQuery ?? ownQuery;
  const setQuery = (q: string) => (onQueryChange ? onQueryChange(q) : setOwnQuery(q));

  // Chaque ouverture repart de la liste ; la saisie, elle, est conservée si contrôlée.
  useEffect(() => {
    if (!open) setCreating(false);
  }, [open]);

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? filterOptions(options, query) : [...options]), [options, query, searching]);
  const recentOptions = useMemo(() => {
    if (!recent || searching) return [];
    const byValue = new Map(options.map((o) => [o.value, o]));
    return recent.map((v) => byValue.get(v)).filter((o): o is SelectOption<V> => o !== undefined);
  }, [recent, options, searching]);
  const showAll = searching || (listAllBeforeSearch ?? recent === undefined);

  const choose = (v: V) => {
    onSelect(v);
    onOpenChange(false);
  };

  const renderRow = (option: SelectOption<V>) => (
    <ListRow
      primary={option.label}
      secondary={option.description}
      leading={option.leading}
      trailing={
        option.value === value ? (
          <Check size={18} className="text-[var(--admin-accent)]" aria-label="Choisi" />
        ) : (
          option.trailing
        )
      }
      disabled={option.disabled}
      onClick={() => choose(option.value)}
    />
  );

  const renderList = (list: readonly SelectOption<V>[]) =>
    list.length > WINDOW_THRESHOLD ? (
      <Card padding={0}>
        <WindowedList
          items={list}
          itemKey={(o) => o.value}
          estimateSize={57}
          gap={0}
          renderItem={(o, i) => <div className={i > 0 ? "border-t border-[var(--admin-border)]" : undefined}>{renderRow(o)}</div>}
        />
      </Card>
    ) : (
      <Card padding={0}>
        {list.map((o, i) => (
          <div key={o.value} className={i > 0 ? "border-t border-[var(--admin-border)]" : undefined}>
            {renderRow(o)}
          </div>
        ))}
      </Card>
    );

  const createButton = onCreate ? (
    <Button variant="secondary" leadingIcon={<Plus size={16} />} onClick={() => setCreating(true)}>
      {onCreate.label(query.trim())}
    </Button>
  ) : null;

  const emptyTitle = typeof empty.title === "function" ? empty.title(query.trim()) : empty.title;

  let body: ReactNode;
  if (creating && onCreate) {
    body = onCreate.form({ query: query.trim(), select: choose, cancel: () => setCreating(false) });
  } else if (error) {
    body = <ErrorBanner message={error.message} onRetry={error.onRetry} />;
  } else if (loading) {
    body = <SkeletonList count={6} />;
  } else {
    const nothing = (showAll ? results.length : recentOptions.length) === 0;
    body = (
      <div className="flex flex-col gap-4">
        {header}
        {recentOptions.length > 0 ? (
          <section className="flex flex-col gap-1">
            <h3 className="admin-type-caption px-1 font-semibold text-[var(--admin-text-muted)]">{recentTitle}</h3>
            {renderList(recentOptions)}
          </section>
        ) : null}
        {showAll && results.length > 0 ? renderList(results) : null}
        {nothing && (searching || options.length === 0) ? (
          createButton ? (
            <EmptyState title={emptyTitle} description={empty.description} action={createButton} />
          ) : searching ? (
            <EmptyState
              title={emptyTitle}
              description={empty.description}
              action={
                <Button variant="secondary" onClick={() => setQuery("")}>
                  Effacer la recherche
                </Button>
              }
            />
          ) : (
            <EmptyState done title={emptyTitle} />
          )
        ) : null}
        {/* En pied dès qu'un texte est saisi, même s'il y a des résultats : jamais de doublon faute de l'avoir vu. */}
        {searching && !nothing && onCreate ? (
          <Card padding={0}>
            <ListRow
              leading={<Plus size={18} className="text-[var(--admin-accent)]" aria-hidden />}
              primary={<span className="admin-type-body truncate font-medium text-[var(--admin-accent)]">{onCreate.label(query.trim())}</span>}
              onClick={() => setCreating(true)}
            />
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      nested={nested}
      toolbar={
        creating ? undefined : (
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
            autoFocus={autoFocusSearch}
          />
        )
      }
    >
      {body}
    </Sheet>
  );
}
