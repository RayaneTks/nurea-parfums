"use client";

import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useReadRoute } from "@/app-shell/hooks/useReadRoute";
import type { PickerCatalogue, PickerPerfume } from "@/contracts/catalogue";
import type { ActionError } from "@/contracts/result";
import { newId } from "@/domain/ids";
import { MAX_LINE_QUANTITY } from "@/domain/sale-line";
import { updateDocumentAction } from "@/server/documents/actions";
import { Button } from "@/ui/primitives/Button";
import { Text } from "@/ui/primitives/Text";
import { customerLabel, documentTitle } from "./document-model";
import type { DocumentSheetProps } from "./DocumentSheet";
import { useSheetChrome } from "./DocumentSheetFrame";
import { LineCard } from "./LineCard";
import {
  draftOfDocumentLine,
  errorsByLine,
  lineFields,
  lineItemOf,
  lineSignature,
  missingOf,
  newCatalogueLine,
  newOffCatalogLine,
  stockBadgeOf,
  withVolume,
  type LineDraft,
} from "./line-draft";
import { PerfumePicker } from "./PerfumePicker";
import { useDiscardGuard } from "./useDiscardGuard";

/** Refus porté par une ligne (reprise hors règles, 03 §4.3) : la fiche s'ouvre en édition sur elle. */
export type LineIssue = { lineId: string; field: string; message: string };

/** `lines.<id>.volumeMl` (writer) → la ligne et son message ; `null` si le refus ne vise pas une ligne connue. */
export function lineIssueOf(error: ActionError): LineIssue | null {
  if (error.code !== "VALIDATION" || !error.fields) return null;
  for (const [path, message] of Object.entries(error.fields)) {
    const match = /^lines\.([^.]+)\.(\w+)$/.exec(path);
    if (match && !/^\d+$/.test(match[1] as string)) return { lineId: match[1] as string, field: match[2] as string, message };
  }
  return null;
}

type LinesEditorProps = DocumentSheetProps & { issue: LineIssue | null; onDone: () => void };

/**
 * S01 zone 4, mode édition en place (06 S01, T2) : chaque ligne devient une carte du composeur (`LineCard`, la même
 * que E11) — volume, quantité, prix, « Offert », rangée repliée « Coût » (coût en dinars, taux, note de la ligne,
 * A-12) —, « Ajouter un article » (S05), « Retirer ». Quantités livrées conservées par le serveur ; réserve si une
 * quantité passe sous le livré. La sheet ne se ferme pas d'un glissement tant que l'édition dure.
 */
export function LinesEditor({ doc, recent, pickerVersion, issue, onDone }: LinesEditorProps) {
  const { showToast } = useToast();
  const initial = useMemo(() => doc.lines.map(draftOfDocumentLine), [doc.lines]);
  const [lines, setLines] = useState<LineDraft[]>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openCost, setOpenCost] = useState<string | null>(issue?.field === "exchangeRate" ? issue.lineId : null);
  const priceRefs = useRef(new Map<string, HTMLInputElement | null>());
  const cardRefs = useRef(new Map<string, HTMLDivElement | null>());
  const picker = useReadRoute<PickerCatalogue>(`/api/admin/picker?v=${encodeURIComponent(pickerVersion)}`);

  const dirty = lineSignature(lines) !== lineSignature(initial);
  const guard = useDiscardGuard(dirty);
  const save = useAction(updateDocumentAction, {
    onSuccess: () => {
      showToast({ type: "success", message: "Articles enregistrés" });
      onDone();
    },
  });
  const serverErrors = errorsByLine(save.error, lines);

  const replace = (next: LineDraft) => setLines((current) => current.map((line) => (line.id === next.id ? next : line)));
  const perfumeOf = (perfumeId: number | null) => (perfumeId === null ? undefined : picker.data?.perfumes.find((p) => p.id === perfumeId));
  const pricingOf = (line: LineDraft) => perfumeOf(line.perfumeId)?.pricing.find((row) => row.volumeMl === line.volumeMl);

  const remove = (line: LineDraft) => {
    const index = lines.findIndex((candidate) => candidate.id === line.id);
    setLines((current) => current.filter((candidate) => candidate.id !== line.id));
    showToast({
      type: "info",
      message: "Ligne retirée",
      actionLabel: "Annuler",
      onAction: () => setLines((current) => [...current.slice(0, index), line, ...current.slice(index)]),
    });
  };

  const add = (perfume: PickerPerfume) => {
    const same = lines.find((line) => line.perfumeId === perfume.id && line.isNew);
    if (same) {
      replace({ ...same, quantity: Math.min(same.quantity + 1, MAX_LINE_QUANTITY) });
      return;
    }
    const remembered = recent.find((item) => item.perfumeId === perfume.id)?.volumeMl ?? null;
    setLines((current) => [...current, newCatalogueLine(newId(), perfume, { volumeMl: remembered })]);
  };

  const firstMissing = lines.map((line) => ({ line, missing: missingOf(line) })).find((entry) => entry.missing !== null);

  const submit = () =>
    void save.run({
      documentId: doc.id,
      lines: lines.map((line) => ({ id: line.id, ...(line.isNew ? { item: lineItemOf(line) } : {}), ...lineFields(line) })),
    });

  const cta = (() => {
    if (lines.length === 0) return { label: "Ajouter un article", disabled: false, onPress: () => setPickerOpen(true) };
    if (firstMissing?.missing) {
      const { line, missing } = firstMissing;
      return {
        label: missing.label,
        disabled: false,
        onPress: () => {
          if (missing.field === "price") priceRefs.current.get(line.id)?.focus();
          else if (missing.field === "rate") setOpenCost(line.id);
          cardRefs.current.get(line.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
        },
      };
    }
    if (!dirty) return { label: "Aucune modification", disabled: true, onPress: () => undefined };
    return { label: "Enregistrer les modifications", disabled: false, onPress: submit };
  })();

  const inDocument = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of lines) if (line.perfumeId !== null) map.set(line.perfumeId, (map.get(line.perfumeId) ?? 0) + line.quantity);
    return map;
  }, [lines]);

  useSheetChrome({
    title: "Modifier les articles",
    description: `${documentTitle(doc.origin, doc.orderedAt)} · ${customerLabel(doc)}`,
    dismissible: false,
    beforeClose: guard,
    footer: (
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" fullWidth isLoading={save.pending} disabled={cta.disabled} onClick={cta.onPress}>
          {cta.label}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={save.pending}
          onClick={() => void guard().then((ok) => ok && onDone())}
        >
          Annuler
        </Button>
      </div>
    ),
  });

  return (
    <div className="flex flex-col gap-4 pb-2" data-lines-editor>
      {lines.map((line) => {
        const delivered = line.deliveredQuantity > 0 ? `${line.deliveredQuantity} déjà livré${line.deliveredQuantity > 1 ? "s" : ""}` : null;
        return (
          <LineCard
            key={line.id}
            line={line}
            pricing={pricingOf(line)}
            badge={stockBadgeOf(perfumeOf(line.perfumeId))}
            caption={[line.brandName, delivered].filter(Boolean).join(" · ")}
            errors={serverErrors.get(line.id)}
            issue={issue?.lineId === line.id ? issue : null}
            costOpen={openCost === line.id}
            onChange={replace}
            onVolume={(volumeMl) => replace(withVolume(line, volumeMl, perfumeOf(line.perfumeId)?.pricing.find((row) => row.volumeMl === volumeMl)))}
            onRemove={lines.length > 1 ? () => remove(line) : undefined}
            priceRef={(el) => void priceRefs.current.set(line.id, el)}
            cardRef={(el) => void cardRefs.current.set(line.id, el)}
          />
        );
      })}

      <Button variant="secondary" fullWidth leadingIcon={<Plus size={16} />} onClick={() => setPickerOpen(true)}>
        Ajouter un article
      </Button>
      {save.error?.fields?.lines ? (
        <Text variant="caption" tone="danger">
          {save.error.fields.lines}
        </Text>
      ) : null}

      <PerfumePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        catalogue={picker.data}
        loading={picker.loading}
        error={picker.error ? { message: "Catalogue indisponible.", onRetry: picker.reload } : null}
        recent={recent}
        inDocument={inDocument}
        onPick={add}
        onOffCatalog={({ name, brandName }) => setLines((current) => [...current, newOffCatalogLine(newId(), name, brandName)])}
      />
    </div>
  );
}
