"use client";

import { HandCoins, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { ORDER_VIEWS, type OrderFilter, type OrderRowDTO, type OrderView, type OrdersListDTO } from "@/contracts/documents";
import type { PocketSummary } from "@/contracts/treasury";
import { changeDocumentStatusAction } from "@/server/documents/actions";
import { lineIssueOf } from "@/features/documents/components/LinesEditor";
import { CollectSheet } from "@/features/documents/components/CollectSheet";
import { documentTitle } from "@/features/documents/components/document-model";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { useGestureToast } from "@/features/documents/components/useGestureToast";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { SwipeableRow } from "@/ui/primitives/SwipeableRow";
import { scrollFieldIntoView } from "@/ui/primitives/field-behavior";
import { FILTER_LABELS, hasDue, rowCaption, rowName, rowTrailing, sectionTitle } from "./orders-model";

/** Au-delà de 6 lignes, la recherche est visible (06 E10 zone 3). */
const SEARCH_THRESHOLD = 6;
const SEARCH_DEBOUNCE_MS = 250;

type CollectSubject = { row: OrderRowDTO; variant: "solde" | "livrer" };

/**
 * E10 — Commandes (06 E10) : vues « À livrer · Livrées · Annulées », sections par urgence, chips, recherche étendue
 * (debounce 250 ms, le champ garde le focus), « Afficher plus », glissements « Livrer » (droite) et « Encaisser »
 * (gauche) qui révèlent — le tap exécute (06 §4.2). Tap sur une ligne : la fiche document au-dessus de la liste.
 */
export function OrdersView({ data, pockets }: { data: OrdersListDTO; pockets: readonly PocketSummary[] }) {
  const url = useUrlState();
  const { showToast } = useToast();
  const sheet = useDocumentSheetNavigation();
  const announce = useGestureToast();
  const collect = useTransientSheet<CollectSubject>();
  const deliver = useAction(changeDocumentStatusAction);
  const [, startTransition] = useTransition();
  const [hidden, hide] = useOptimistic<ReadonlySet<string>, string>(new Set(), (current, id) => new Set([...current, id]));

  const vue = data.vue;
  const setUrl = url.set;

  // ── Recherche : saisie locale, écrite dans l'URL après 250 ms ; une URL changée ailleurs (onglet) la remplace.
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
      setUrl({ q: next || null, pages: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, setUrl]);

  const viewCount = vue === "a-livrer" ? data.counts.aLivrer : vue === "livrees" ? data.counts.livrees : data.counts.annulees;
  const searching = data.q !== "" || query !== "";
  const showSearch = viewCount > SEARCH_THRESHOLD || searching;

  const segments = useMemo(
    () =>
      ORDER_VIEWS.filter((view) => view !== "annulees" || data.counts.annulees > 0 || vue === "annulees").map((view) => ({
        value: view,
        label: view === "a-livrer" ? `À livrer (${data.counts.aLivrer})` : view === "livrees" ? "Livrées" : "Annulées",
      })),
    [data.counts.aLivrer, data.counts.annulees, vue],
  );

  const setView = (next: OrderView) => setUrl({ vue: next, filtre: null, pages: null }, { defaults: { vue: "a-livrer" } });
  const setFilter = (next: OrderFilter | null) => setUrl({ filtre: next, pages: null });
  const clearAll = () => {
    sent.current = "";
    setQuery("");
    setUrl({ q: null, filtre: null, pages: null });
  };

  const rows = useMemo(() => new Map(data.sections.flatMap((section) => section.rows.map((row) => [row.id, row] as const))), [data.sections]);

  const onDeliver = (row: OrderRowDTO) => {
    if (hasDue(row)) {
      collect.show({ row, variant: "livrer" });
      return;
    }
    startTransition(async () => {
      hide(row.id);
      const result = await deliver.run({ documentId: row.id, to: "DELIVERED" });
      if (result.ok) {
        announce(`Commande de ${rowName(row)} livrée`, result.data.undo, "Livraison annulée.");
      } else if (result.error.code === "VALIDATION" && lineIssueOf(result.error)) {
        showToast({ type: "error", message: result.error.message });
        sheet.open(row.id, { edition: true });
      }
    });
  };

  const linkFilter = data.filtre === "retard" || data.filtre === "aujourdhui" || data.filtre === "demain" ? data.filtre : null;
  const statusFilterActive = data.filtre === "en-attente" || data.filtre === "confirmees";
  const showStatusChips = vue === "a-livrer" && ((data.chips.enAttente > 0 && data.chips.confirmees > 0) || statusFilterActive);

  const visibleSections = data.sections
    .map((section) => ({ ...section, rows: section.rows.filter((row) => !hidden.has(row.id)) }))
    .filter((section) => section.rows.length > 0);

  const subject = collect.subject;
  const liveRow = subject ? (rows.get(subject.row.id) ?? subject.row) : null;

  return (
    <div className="flex flex-col gap-3" data-orders-view={vue}>
      <SegmentedControl ariaLabel="Vue des commandes" options={segments} value={vue} onChange={setView} />

      {showSearch ? (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Client, parfum, marque, lot…"
          ariaLabel="Rechercher une commande"
          // Sous le titre et les vues, le champ tombait sous le clavier d'un iPhone SE : il est recentré (05 §3.1).
          onFocus={scrollFieldIntoView}
        />
      ) : null}

      {vue === "a-livrer" && (linkFilter || showStatusChips) ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtres">
          {linkFilter ? (
            <Chip active clearable onClick={() => setFilter(null)} ariaLabel={`Retirer le filtre ${FILTER_LABELS[linkFilter]}`}>
              {FILTER_LABELS[linkFilter]}
            </Chip>
          ) : null}
          {showStatusChips ? (
            <>
              <Chip
                active={data.filtre === "en-attente"}
                clearable={data.filtre === "en-attente"}
                count={data.chips.enAttente}
                onClick={() => setFilter(data.filtre === "en-attente" ? null : "en-attente")}
              >
                En attente
              </Chip>
              <Chip
                active={data.filtre === "confirmees"}
                clearable={data.filtre === "confirmees"}
                count={data.chips.confirmees}
                onClick={() => setFilter(data.filtre === "confirmees" ? null : "confirmees")}
              >
                Confirmées
              </Chip>
            </>
          ) : null}
        </div>
      ) : null}

      <div className={url.pending ? "flex flex-col gap-4 opacity-60 transition-opacity" : "flex flex-col gap-4"} aria-busy={url.pending || undefined}>
        {visibleSections.length === 0 ? (
          data.counts.all === 0 ? (
            <EmptyState done title="Aucune commande pour l'instant : « Nouvelle commande » en prend une." />
          ) : data.q || data.filtre ? (
            <EmptyState
              title={data.q ? `Rien ne correspond à « ${data.q} ».` : "Aucune commande ne correspond"}
              description={data.q ? "La recherche couvre le client, le contact, le parfum, la marque, le lot et les notes." : undefined}
              action={
                <Button variant="secondary" onClick={clearAll}>
                  Effacer les filtres
                </Button>
              }
            />
          ) : (
            <EmptyState done title={vue === "a-livrer" ? "Rien à livrer." : vue === "livrees" ? "Aucune commande livrée." : "Aucune commande annulée."} />
          )
        ) : (
          visibleSections.map((section) => (
            <ListSection
              key={section.key}
              title={sectionTitle(section)}
              count={section.count}
              tone={section.key === "retard" ? "warning" : "default"}
            >
              {section.rows.map((row) => (
                <OrderLine
                  key={row.id}
                  row={row}
                  view={vue}
                  onOpen={() => sheet.open(row.id)}
                  onDeliver={() => onDeliver(row)}
                  onCollect={() => collect.show({ row, variant: "solde" })}
                />
              ))}
            </ListSection>
          ))
        )}

        {data.hasMore && visibleSections.length > 0 ? (
          <Button variant="secondary" fullWidth onClick={() => setUrl({ pages: data.pages + 1 })} isLoading={url.pending}>
            Afficher plus
          </Button>
        ) : null}
      </div>

      {subject && liveRow ? (
        <CollectSheet
          key={collect.key}
          open={collect.open}
          onClose={collect.hide}
          variant={subject.variant}
          customerName={rowName(liveRow)}
          targets={[
            {
              id: liveRow.id,
              origin: "ORDER",
              status: liveRow.status,
              label: documentTitle("ORDER", liveRow.orderedAt),
              total: liveRow.total,
              paid: liveRow.paid,
              due: liveRow.due,
            },
          ]}
          pockets={pockets}
          onValidation={(error) => {
            collect.hide();
            showToast({ type: "error", message: error.message });
            sheet.open(liveRow.id, { edition: true });
          }}
        />
      ) : null}
    </div>
  );
}

function OrderLine({
  row,
  view,
  onOpen,
  onDeliver,
  onCollect,
}: {
  row: OrderRowDTO;
  view: OrderView;
  onOpen: () => void;
  onDeliver: () => void;
  onCollect: () => void;
}) {
  const name = rowName(row);
  const trailing = rowTrailing(row, view);
  return (
    <SwipeableRow
      leftAction={
        view === "a-livrer" ? { icon: <PackageCheck size={20} />, label: "Livrer", tone: "success", onAction: onDeliver } : undefined
      }
      rightAction={
        view !== "annulees" && hasDue(row)
          ? { icon: <HandCoins size={20} />, label: "Encaisser", tone: "warning", onAction: onCollect }
          : undefined
      }
    >
      <div data-order-row={row.id}>
        <ListRow
          leading={<Avatar name={name} size="md" />}
          primary={name}
          secondary={rowCaption(row, view)}
          trailing={
            trailing === "pending" ? (
              <Badge tone="neutral">En attente</Badge>
            ) : trailing === "due" ? (
              <Money value={row.due} tone="warning" bold />
            ) : trailing === "total" ? (
              <Money value={row.total} tone="muted" />
            ) : undefined
          }
          onClick={onOpen}
          ariaLabel={`${name}, ${documentTitle("ORDER", row.orderedAt)}`}
        />
      </div>
    </SwipeableRow>
  );
}
