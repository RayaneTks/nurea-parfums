"use client";

import { ClipboardList, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { isNavigable, routes } from "@/app-shell/routes";
import type { ComptaDocumentRowDTO, ComptaDocumentSectionDTO, ComptaDocumentsDTO } from "@/contracts/compta";
import { PASSING_CUSTOMER } from "@/features/documents/components/document-model";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { Divider } from "@/ui/primitives/Divider";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { WindowedList } from "@/ui/primitives/WindowedList";
import { scrollFieldIntoView } from "@/ui/primitives/field-behavior";
import { SEARCH_THRESHOLD, documentCaption, documentTrailing } from "./compta-model";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * E03 zones 4 et 5 — documents de la période (un paiement ou un engagement dans la période), une section par lot
 * (ouverts d'abord, en-tête SANS montant : les montants d'un lot se lisent sur sa fiche, 02 §4.3) puis « Hors
 * lot » ; recherche étendue de E10 (visible au-delà de 6 documents ou tant qu'elle filtre, le champ garde le
 * focus) ; chip « Coût à compléter ✕ » tant que le filtre est posé. Tap sur une ligne : la fiche document.
 */
export function PeriodDocuments({ data }: { data: ComptaDocumentsDTO }) {
  const url = useUrlState();
  const sheet = useDocumentSheetNavigation();
  const setUrl = url.set;

  const [query, setQuery] = useState(data.q);
  const sent = useRef(data.q);
  useEffect(() => {
    if (data.q !== sent.current) {
      sent.current = data.q;
      setQuery(data.q);
    }
  }, [data.q]);
  useEffect(() => {
    const next = query.trim();
    if (next === sent.current) return;
    const timer = window.setTimeout(() => {
      sent.current = next;
      setUrl({ q: next || null });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, setUrl]);

  const searching = data.q !== "" || query !== "";
  const showSearch = data.scopeCount > SEARCH_THRESHOLD || searching;

  const clearSearch = () => {
    sent.current = "";
    setQuery("");
    setUrl({ q: null });
  };

  let body;
  if (data.total > 0) {
    body = data.sections.map((section) => <DocumentSection key={section.key} section={section} onOpen={(id) => sheet.open(id)} />);
  } else if (data.q !== "") {
    body = (
      <EmptyState
        title={`Rien ne correspond à « ${data.q} »`}
        description="La recherche couvre le client, le contact, le parfum, la marque, le lot et les notes."
        action={
          <Button variant="secondary" onClick={clearSearch}>
            Effacer la recherche
          </Button>
        }
      />
    );
  } else if (data.filtre) {
    body = (
      <EmptyState
        title="Aucun document au coût à compléter sur cette période."
        action={
          <Button variant="secondary" onClick={() => setUrl({ filtre: null })}>
            Effacer le filtre
          </Button>
        }
      />
    );
  } else {
    // Période sans document : la ligne calme est dite par les chiffres (« Aucune vente sur cette période. »).
    body = null;
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Documents de la période" data-period-documents>
      {data.filtre ? (
        <div className="flex gap-2" role="group" aria-label="Filtres">
          <Chip active clearable onClick={() => setUrl({ filtre: null })} ariaLabel="Retirer le filtre Coût à compléter">
            Coût à compléter
          </Chip>
        </div>
      ) : null}
      {showSearch ? (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Client, parfum, marque, lot…"
          ariaLabel="Rechercher un document"
          onFocus={scrollFieldIntoView}
        />
      ) : null}
      {body}
    </section>
  );
}

function DocumentSection({ section, onOpen }: { section: ComptaDocumentSectionDTO; onOpen: (id: string) => void }) {
  const lotHref = section.batch ? routes.lot(section.batch.id) : null;
  const title = section.batch ? section.batch.name : "Hors lot";
  return (
    <ListSection title={title} count={section.rows.length} href={lotHref && isNavigable(lotHref) ? lotHref : undefined}>
      <WindowedList
        items={section.rows}
        itemKey={(row) => row.id}
        estimateSize={57}
        gap={0}
        renderItem={(row, index) => (
          <>
            {index > 0 ? <Divider /> : null}
            <DocumentRow row={row} onOpen={onOpen} />
          </>
        )}
      />
    </ListSection>
  );
}

function DocumentRow({ row, onOpen }: { row: ComptaDocumentRowDTO; onOpen: (id: string) => void }) {
  const name = row.customerName?.trim() ? row.customerName : PASSING_CUSTOMER;
  const trailing = documentTrailing(row);
  return (
    <div data-compta-document={row.id}>
      <ListRow
        leading={
          row.origin === "ORDER" ? (
            <ClipboardList size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
          ) : (
            <ShoppingBag size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
          )
        }
        primary={name}
        secondary={
          <>
            {documentCaption(row)}
            {row.hasUnknownCost ? <span className="text-[var(--admin-warning)]"> · Coût à compléter</span> : null}
          </>
        }
        trailing={trailing.kind === "due" ? <Money value={trailing.value} tone="warning" bold /> : <Money value={trailing.value} tone="muted" />}
        onClick={() => onOpen(row.id)}
      />
    </div>
  );
}
