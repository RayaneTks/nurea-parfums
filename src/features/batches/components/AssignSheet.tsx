"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { withSheet } from "@/app-shell/routes";
import type { AssignCandidateDTO, AssignSheetDTO } from "@/contracts/batches";
import { foldText, searchTerms } from "@/contracts/search";
import { assignDocumentsToBatchAction } from "@/server/documents/actions";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Checkbox } from "@/ui/primitives/Checkbox";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { assignCta, assignToast, documentRowLabel, hasDue, rowName, truncationNotice, unbatchedCaption } from "./batches-model";

/**
 * S13 — Rattacher des documents à un lot (`?assigner=1` sur E06).
 *
 * UNE seule sheet, tous statuts non annulés : la production en avait deux, jumelles, une pour les
 * ventes et une pour les commandes — elles affichaient deux listes différentes du même ensemble
 * (01 §4.4). Ici, un document sans lot et un document DE ce lot sont les deux faces d'une même
 * question : la case dit à quoi il appartient.
 *
 * Les candidats viennent du RSC de la page (04 §2.3) : la sheet ne lance AUCUNE requête. C'est ce qui
 * met fin à la boucle « requête → erreur → requête » dont la fermeture d'un toast décochait les cases.
 *
 * Le filtrage de la recherche se fait sur la liste déjà servie, sur l'appareil : pas d'aller-retour,
 * pas de case qui disparaît sous le doigt.
 */
export function AssignSheet({ data }: { data: AssignSheetDTO }) {
  const url = useUrlState();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(new Map());
  /**
   * Recherche en cours : le pied et la description s'effacent le temps de la frappe (même remède que
   * la fiche document). Clavier ouvert sur un iPhone SE, titre + recherche + pied ne laissaient que
   * quelques dizaines de pixels à la liste — l'invariant « sheet écrasée » le refuse, et à raison :
   * on filtre pour VOIR les lignes. Le CTA revient dès que le clavier se ferme.
   */
  const [typing, setTyping] = useState(false);

  const close = () => url.set({ assigner: null });
  useShellSheet(true, close);

  const assign = useAction(assignDocumentsToBatchAction);

  const isChecked = (candidate: AssignCandidateDTO) => toggled.get(candidate.id) ?? candidate.attached;

  /**
   * Le différentiel, et lui seul : un document dont la case n'a pas bougé ne part pas (06 S13). `from`
   * est le lot que l'ÉCRAN affichait — c'est ce qui fait refuser un document déplacé entre-temps au
   * lieu de l'écraser en silence (04 T13).
   */
  const changes = useMemo(
    () =>
      data.candidates
        .filter((candidate) => (toggled.get(candidate.id) ?? candidate.attached) !== candidate.attached)
        .map((candidate) => ({
          documentId: candidate.id,
          from: candidate.attached ? data.batchId : null,
          to: candidate.attached ? null : data.batchId,
        })),
    [data.candidates, data.batchId, toggled],
  );

  const shown = useMemo(() => {
    const terms = searchTerms(query);
    if (terms.length === 0) return data.candidates;
    return data.candidates.filter((candidate) => {
      const hay = foldText([rowName(candidate), unbatchedCaption(candidate), ...candidate.items].join(" "));
      return terms.every((term) => hay.includes(term));
    });
  }, [data.candidates, query]);

  const submit = () => {
    if (changes.length === 0) return;
    const asked = changes;
    void assign.run({ changes: asked }).then((result) => {
      if (!result.ok) return;
      // Le toast dit ce qui a été APPLIQUÉ : `changed` est le nombre de documents réellement écrits.
      showToast({
        type: "success",
        message: assignToast({
          attached: asked.filter((change) => change.to !== null).length,
          detached: asked.filter((change) => change.to === null).length,
          applied: result.data.changed,
        }),
      });
      close();
    });
  };

  const notice = truncationNotice(data.candidates.length, data.total);

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Rattacher des documents"
      description={typing ? undefined : data.batchName}
      toolbar={
        data.candidates.length > 0 ? (
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Client, parfum, marque…"
            ariaLabel="Rechercher un document"
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
          />
        ) : undefined
      }
      footer={
        typing ? undefined : (
          <Button variant="primary" size="lg" fullWidth isLoading={assign.pending} disabled={changes.length === 0} onClick={submit}>
            {assignCta(changes.length)}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3" data-assign-sheet>
        {data.candidates.length === 0 ? (
          <EmptyState done title="Aucun document à rattacher." />
        ) : shown.length === 0 ? (
          <EmptyState
            title={`Rien ne correspond à « ${query} ».`}
            action={
              <Button variant="secondary" onClick={() => setQuery("")}>
                Effacer la recherche
              </Button>
            }
          />
        ) : (
          <ListSection title="Documents" count={shown.length} description={notice ?? undefined}>
            {shown.map((candidate) => {
              const checked = isChecked(candidate);
              const toggle = () => setToggled((current) => new Map(current).set(candidate.id, !checked));
              return (
                <ListRow
                  key={candidate.id}
                  leading={
                    <Checkbox
                      checked={checked}
                      onCheckedChange={toggle}
                      ariaLabel={`${checked ? "Retirer" : "Rattacher"} ${documentRowLabel(candidate)}`}
                    />
                  }
                  primary={rowName(candidate)}
                  secondary={unbatchedCaption(candidate)}
                  trailing={
                    hasDue(candidate) ? (
                      <Money value={candidate.due} tone="warning" />
                    ) : (
                      <Money value={candidate.total} tone="muted" />
                    )
                  }
                  // Toute la rangée bascule la case (05 §3.1 `Checkbox`) : 56 px de cible, pas 44.
                  onClick={toggle}
                />
              );
            })}
          </ListSection>
        )}
        {notice ? (
          <Text variant="caption" tone="muted" className="px-1">
            {notice} — affine la recherche pour voir les autres.
          </Text>
        ) : null}
      </div>
    </Sheet>
  );
}

/** URL qui ouvre S13 sur la fiche d'un lot : `?assigner=1` (06 §1.2). */
export const assignHref = (url: string) => withSheet(url, { assigner: true });
