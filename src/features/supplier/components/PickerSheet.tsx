"use client";

import { useMemo, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import type { SupplierItemInput, SupplierPickerDTO } from "@/contracts/supplier";
import { dzdFromDb, formatDzd, toDb, type Rate } from "@/domain/money";
import { truncationNotice } from "@/features/batches/components/batches-model";
import { ListSection } from "@/ui/patterns/ListSection";
import { Button } from "@/ui/primitives/Button";
import { Checkbox } from "@/ui/primitives/Checkbox";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import {
  batchCaption,
  batchState,
  documentCaption,
  documentName,
  matchBatches,
  matchDocuments,
  missingLabel,
  notedName,
  pickedItems,
  pickedSummary,
  summaryLine,
  toggleBatch,
  toggleDocument,
} from "./picker-model";
import { eurReading } from "./supplier-model";

/** Documents rendus par page : la liste peut en porter mille, l'iPhone n'en dessine que ce qu'on regarde. */
const PAGE = 50;

/** Ce que S25 remet au formulaire de la dette (S23) : montant pré-rempli, éléments cochés. */
export type PickedDebt = { amountDzd: string; items: SupplierItemInput[]; missingLines: number };

type PickerSheetProps = {
  data: SupplierPickerDTO;
  rate: Rate;
  onClose: () => void;
  /** « Noter cette dette » : ouvre S23 pré-rempli, au-dessus. */
  onPicked: (debt: PickedDebt) => void;
  /** « Saisir à la main » : S23 vide. */
  onManual: () => void;
};

/**
 * S25 — Sélecteur d'une dette (`?selection=1` sur E22 ; docs/admin/dettes-fournisseur.md).
 *
 * Les documents non annulés (en attente compris) et les lots, servis par le RSC de la page : la sheet ne
 * lance aucune requête, et la recherche filtre sur l'appareil (même parti que S13). Cocher un lot coche ses
 * documents. Ce qu'une dette a déjà noté reste cochable, grisé, avec le nom de cette dette : on peut devoir
 * deux fois pour une même commande (un réassort), c'est au gérant d'en juger.
 */
export function PickerSheet({ data, rate, onClose, onPicked, onManual }: PickerSheetProps) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [pages, setPages] = useState(1);
  // Clavier ouvert sur la recherche : le bandeau s'efface le temps de la frappe (même remède que S13).
  const [typing, setTyping] = useState(false);
  useShellSheet(true, onClose);

  const batchNames = useMemo(() => new Map(data.batches.map((batch) => [batch.id, batch.name])), [data.batches]);
  const documents = useMemo(() => matchDocuments(data.documents, batchNames, query), [data.documents, batchNames, query]);
  const batches = useMemo(() => matchBatches(data.batches, query), [data.batches, query]);
  const summary = pickedSummary(data.documents, data.batches, picked);
  const missing = missingLabel(summary.missingLines);
  const notice = truncationNotice(data.documents.length, data.total);
  const empty = data.documents.length === 0;

  const submit = () => {
    if (summary.count === 0) return;
    onPicked({
      amountDzd: toDb(summary.totalDzd),
      items: pickedItems(data.documents, data.batches, picked),
      missingLines: summary.missingLines,
    });
  };

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Noter une dette"
      description={typing ? undefined : "Coche ce que tu dois : le coût en dinars s'additionne."}
      toolbar={
        empty ? undefined : (
          <SearchField
            value={query}
            onChange={(next) => {
              setQuery(next);
              setPages(1);
            }}
            placeholder="Client, parfum, lot…"
            ariaLabel="Rechercher une commande ou un lot"
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
          />
        )
      }
      footer={
        typing || empty ? undefined : (
          <div className="flex flex-col gap-2" data-supplier-picker-summary>
            <div className="flex items-baseline justify-between gap-3">
              <Text variant="bodyEm" className="tnum">
                {summaryLine(summary)}
              </Text>
              <Text variant="caption" tone="muted" className="tnum">
                {eurReading(summary.totalDzd, rate)}
              </Text>
            </div>
            {missing ? (
              <Text variant="caption" tone="warning">
                {missing} : leur coût n&apos;est pas compté.
              </Text>
            ) : null}
            <Button variant="primary" size="lg" fullWidth disabled={summary.count === 0} onClick={submit}>
              {summary.count === 0 ? "Coche au moins un élément" : "Noter cette dette"}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-3" data-supplier-picker>
        {empty ? (
          <EmptyState
            title="Aucune commande ni vente à cocher."
            description="Note la dette en saisissant le montant toi-même."
            action={
              <Button variant="secondary" onClick={onManual}>
                Saisir à la main
              </Button>
            }
          />
        ) : null}
        {empty ? null : (
          <Button variant="secondary" fullWidth onClick={onManual}>
            Saisir à la main
          </Button>
        )}

        {empty ? null : documents.length === 0 && batches.length === 0 ? (
          <EmptyState
            title={`Rien ne correspond à « ${query} ».`}
            action={
              <Button variant="secondary" onClick={() => setQuery("")}>
                Effacer la recherche
              </Button>
            }
          />
        ) : (
          <>
            {batches.length > 0 ? (
              <ListSection title="Lots" count={batches.length}>
                {batches.map((batch) => {
                  const state = batchState(data.documents, batch.id, picked);
                  const toggle = () => setPicked((current) => toggleBatch(data.documents, batch.id, current));
                  return (
                    <ListRow
                      key={batch.id}
                      leading={
                        <Checkbox
                          checked={state === "all"}
                          onCheckedChange={toggle}
                          ariaLabel={`${state === "all" ? "Décocher" : "Cocher"} le lot ${batch.name}`}
                        />
                      }
                      primary={batch.name}
                      secondary={
                        <>
                          {batch.noted ? `Déjà noté : ${notedName(batch.noted)} · ` : ""}
                          {batchCaption(batch)}
                          {state === "some" ? " · en partie coché" : ""}
                        </>
                      }
                      trailing={<PickedCost value={batch.costDzd} noted={batch.noted !== null} />}
                      onClick={toggle}
                    />
                  );
                })}
              </ListSection>
            ) : null}

            {documents.length > 0 ? (
              <ListSection title="Commandes et ventes" count={documents.length} description={notice ?? undefined}>
                {documents.slice(0, pages * PAGE).map((doc) => {
                  const checked = picked.has(doc.id);
                  const toggle = () => setPicked((current) => toggleDocument(doc.id, current));
                  const caption = documentCaption(doc, doc.batchId ? (batchNames.get(doc.batchId) ?? null) : null);
                  return (
                    <ListRow
                      key={doc.id}
                      leading={
                        <Checkbox
                          checked={checked}
                          onCheckedChange={toggle}
                          ariaLabel={`${checked ? "Décocher" : "Cocher"} ${documentName(doc)}, ${caption}`}
                        />
                      }
                      primary={documentName(doc)}
                      secondary={
                        <>
                          {doc.noted ? `Déjà noté : ${notedName(doc.noted)} · ` : ""}
                          {caption}
                          {doc.missingLines > 0
                            ? ` · ${doc.missingLines === doc.lineCount ? "sans coût" : `${doc.missingLines} sans coût`}`
                            : ""}
                        </>
                      }
                      trailing={<PickedCost value={doc.costDzd} noted={doc.noted !== null} />}
                      onClick={toggle}
                    />
                  );
                })}
              </ListSection>
            ) : null}
            {documents.length > pages * PAGE ? (
              <Button variant="secondary" fullWidth onClick={() => setPages((n) => n + 1)}>
                Afficher plus ({documents.length - pages * PAGE})
              </Button>
            ) : null}
          </>
        )}
      </div>
    </Sheet>
  );
}

function PickedCost({ value, noted }: { value: string; noted: boolean }) {
  return (
    <Text as="span" variant="bodyEm" tone={noted ? "muted" : "default"} className="tnum">
      {formatDzd(dzdFromDb(value))}
    </Text>
  );
}
