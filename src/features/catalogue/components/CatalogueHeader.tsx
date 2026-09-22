"use client";

import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { SearchField } from "@/ui/primitives/SearchField";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import type { CatalogueTab } from "./catalogue-model";
import { useCatalogueUrl } from "./useCatalogueUrl";

const TAB_OPTIONS: readonly { value: CatalogueTab; label: string }[] = [
  { value: "parfums", label: "Parfums" },
  { value: "marques", label: "Marques" },
  { value: "en-avant", label: "En avant" },
];

const PLACEHOLDER: Record<CatalogueTab, string> = {
  parfums: "Rechercher un parfum ou une marque",
  marques: "Rechercher une marque",
  "en-avant": "Rechercher un parfum visible",
};

/** Délai entre la dernière lettre et l'écriture de `?q=` (la liste, elle, suit l'URL). */
const SEARCH_DEBOUNCE_MS = 150;

/**
 * Zone épinglée de l'écran Catalogue (06 E15 zones 1-2) : titre, onglets « Parfums · Marques · En avant »
 * et recherche insensible aux accents. Changer d'onglet garde la recherche, efface les filtres propres à
 * l'onglet quitté.
 */
export function CatalogueHeader() {
  const { tab, query, write } = useCatalogueUrl();
  const [text, setText] = useState(query);
  const written = useRef(query);

  // Une recherche effacée ailleurs (tap sur l'onglet actif, « Effacer les filtres ») revient dans le champ.
  useEffect(() => {
    if (query !== written.current) {
      written.current = query;
      setText(query);
    }
  }, [query]);

  useEffect(() => {
    if (text === written.current) return;
    const timer = window.setTimeout(() => {
      written.current = text;
      write({ q: text.trim() === "" ? null : text });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, write]);

  return (
    <div className="flex flex-col gap-3 px-4 pb-3 pt-2">
      <SectionHeader title="Catalogue" />
      <SegmentedControl
        ariaLabel="Parties du catalogue"
        options={TAB_OPTIONS}
        value={tab}
        onChange={(next) => write({ tab: next, stock: null, visibilite: null, gamme: null })}
      />
      <SearchField
        value={text}
        onChange={setText}
        onClear={() => {
          written.current = "";
          write({ q: null });
        }}
        placeholder={PLACEHOLDER[tab]}
        ariaLabel="Rechercher dans le catalogue"
      />
    </div>
  );
}

/** Même gabarit, sans état d'URL : affiché avant l'hydratation du composant client. */
export function CatalogueHeaderFallback() {
  return (
    <div className="flex flex-col gap-3 px-4 pb-3 pt-2">
      <SectionHeader title="Catalogue" />
      <div aria-hidden className="h-[calc(var(--admin-touch-min)+var(--admin-space-2))] rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)]" />
      <div aria-hidden className="h-[var(--admin-touch-min)] rounded-[var(--admin-radius-md)] border border-[var(--admin-border-strong)] bg-[var(--admin-surface)]" />
    </div>
  );
}
