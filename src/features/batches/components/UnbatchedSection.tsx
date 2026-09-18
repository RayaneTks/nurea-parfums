"use client";

import { Boxes } from "lucide-react";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import type { BatchDocumentRowDTO, BatchSummary, UnbatchedDTO } from "@/contracts/batches";
import { assignDocumentsToBatchAction } from "@/server/documents/actions";
// Chemin direct, JAMAIS le baril `@/features/documents` : il exporte aussi `DocumentSheetSlot`, un
// composant serveur, dont l'import depuis un composant client tire tout `src/server` dans le paquet
// de l'appareil (le build le refuse : « node:async_hooks »).
import { BatchPicker } from "@/features/documents/components/BatchPicker";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Avatar } from "@/ui/primitives/Avatar";
import { Button } from "@/ui/primitives/Button";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { scrollFieldIntoView } from "@/ui/primitives/field-behavior";
import { documentRowLabel, hasDue, rowName, truncationNotice, unbatchedCaption, unbatchedTitle } from "./batches-model";

/** Au-delà, le champ de recherche est visible (06 E05 zone 0, même seuil que E10 zone 3). */
const SEARCH_THRESHOLD = 6;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Rangées de « À rattacher » montrées d'emblée.
 *
 * Écart assumé avec 06 E05 zone 0, qui affiche les 100 lignes de la page : avec 17 documents non
 * rangés, la liste des LOTS — le sujet de l'écran — tombait hors de l'écran, et il fallait défiler
 * longtemps pour l'atteindre. La zone garde sa place en tête et son compte exact ; elle ne prend
 * plus toute la hauteur. Le rangement d'un document reste à 3 taps (la première rangée est visible),
 * et rien n'est tronqué en silence : le bouton dit combien de lignes il reste à déplier.
 */
const ROWS_BEFORE_EXPAND = 4;

type UnbatchedSectionProps = {
  data: UnbatchedDTO;
  /** Lots OUVERTS : un lot clos n'accepte aucun rattachement, S07 ne le propose donc pas. */
  batches: readonly BatchSummary[];
  /** Ouvre la fiche document (S01) au-dessus de l'écran. */
  onOpenDocument: (id: string) => void;
  /** Recherche en cours dans l'URL : la section reste montée tant qu'elle filtre. */
  q: string;
  pages: number;
};

/**
 * E05 zone 0 — « À rattacher » (écart du 17/09/2026, capacité de production `521e086`).
 *
 * Ce qui n'appartient à aucun lot, EN TÊTE de l'écran : personne ne pense à aller le chercher. Une
 * commande livrée y figure aussi — c'est justement l'envoi terminé qu'on veut rattacher pour lui
 * imputer transport et douane.
 *
 * Le rattachement est optimiste : la ligne quitte la section sans attendre le rafraîchissement, et
 * revient avec un toast qui porte la raison si le serveur refuse (05 §5.2). 3 taps par document,
 * sans ouvrir une seule fiche (06 §2 PC-08, variante).
 */
export function UnbatchedSection({ data, batches, onOpenDocument, q, pages }: UnbatchedSectionProps) {
  const url = useUrlState();
  const { showToast } = useToast();
  const setUrl = url.set;
  const [picking, setPicking] = useState<BatchDocumentRowDTO | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const [assigned, markAssigned] = useOptimistic<ReadonlySet<string>, string>(new Set(), (current, id) => new Set([...current, id]));
  const assign = useAction(assignDocumentsToBatchAction);

  // Recherche : saisie locale, écrite dans l'URL après 250 ms ; une URL changée ailleurs la remplace.
  const [query, setQuery] = useState(q);
  const sent = useRef(q);
  useEffect(() => {
    if (q !== sent.current) {
      sent.current = q;
      setQuery(q);
    }
  }, [q]);
  useEffect(() => {
    const next = query.trim();
    if (next === sent.current) return;
    const timer = window.setTimeout(() => {
      sent.current = next;
      setUrl({ q: next || null, pages: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, setUrl]);

  const searching = q !== "" || query !== "";
  const rows = data.rows.filter((row) => !assigned.has(row.id));

  // Rien à ranger et aucune recherche en cours : la section n'existe pas (06 E05 zone 0 « absente s'il n'y a rien »).
  if (rows.length === 0 && !searching) return null;

  const shown = expanded ? rows : rows.slice(0, ROWS_BEFORE_EXPAND);
  const hidden = rows.length - shown.length;

  const onChooseBatch = (row: BatchDocumentRowDTO, batchId: string | null) => {
    setPicking(null);
    if (batchId === null) return;
    const batch = batches.find((candidate) => candidate.id === batchId);
    startTransition(async () => {
      markAssigned(row.id);
      const result = await assign.run({ changes: [{ documentId: row.id, from: null, to: batchId }] });
      // Le toast nomme le lot d'arrivée : la ligne a disparu, il faut savoir où elle est partie.
      if (result.ok && batch) showToast({ type: "success", message: `Rattaché à ${batch.name}` });
    });
  };

  const notice = truncationNotice(shown.length, data.total);

  return (
    <div className="flex flex-col gap-2" data-unbatched>
      {data.total > SEARCH_THRESHOLD || searching ? (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Client, parfum, marque, notes…"
          ariaLabel="Rechercher un document à rattacher"
          onFocus={scrollFieldIntoView}
        />
      ) : null}

      {rows.length === 0 ? (
        <ListSection title={unbatchedTitle} count={data.total}>
          <ListRow
            primary={`Rien ne correspond à « ${q} ».`}
            secondary="La recherche couvre le client, le contact, le parfum, la marque et les notes."
          />
        </ListSection>
      ) : (
        <ListSection
          title={unbatchedTitle}
          count={data.total}
          description={notice ?? "Ce qui n'appartient à aucun lot"}
          footer={
            hidden > 0 ? (
              // Déplie la page déjà chargée : aucun aller-retour, et le compte caché est dit.
              <Button variant="secondary" fullWidth onClick={() => setExpanded(true)}>
                {`Afficher les ${hidden} autres`}
              </Button>
            ) : data.hasMore ? (
              <Button variant="secondary" fullWidth isLoading={url.pending} onClick={() => setUrl({ pages: pages + 1 })}>
                Afficher plus
              </Button>
            ) : null
          }
        >
          {shown.map((row) => (
            <ListRow
              key={row.id}
              leading={<Avatar name={rowName(row)} size="md" />}
              primary={rowName(row)}
              secondary={
                <>
                  {unbatchedCaption(row)}
                  {" · "}
                  {hasDue(row) ? <Money value={row.due} tone="warning" /> : <Money value={row.total} tone="muted" />}
                </>
              }
              trailing={
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Boxes size={16} aria-hidden />}
                  ariaLabel={`Choisir le lot de ${documentRowLabel(row)}`}
                  onClick={() => setPicking(row)}
                >
                  Lot
                </Button>
              }
              onClick={() => onOpenDocument(row.id)}
              ariaLabel={documentRowLabel(row)}
            />
          ))}
        </ListSection>
      )}

      <BatchPicker
        open={picking !== null}
        onOpenChange={(open) => (open ? undefined : setPicking(null))}
        nested={false}
        allowNone={false}
        batches={batches}
        value={null}
        onSelect={(batchId) => picking && onChooseBatch(picking, batchId)}
      />
    </div>
  );
}
