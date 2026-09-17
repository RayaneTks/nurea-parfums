"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useReadRoute } from "@/app-shell/hooks/useReadRoute";
import type { PickerCatalogue, PickerPerfume } from "@/contracts/catalogue";
import type { DocumentLineDTO } from "@/contracts/documents";
import type { ActionError } from "@/contracts/result";
import { newId } from "@/domain/ids";
import { dzdToEur, eur, eurFromWire, formatDzd, formatEur, parseDzdInput, parseEurInput, parseRateInput } from "@/domain/money";
import { DEFAULT_VOLUME_ML, MAX_LINE_QUANTITY, VOLUMES_ML, isVolumeMl } from "@/domain/sale-line";
import { updateDocumentAction } from "@/server/documents/actions";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { GiftToggle } from "@/ui/patterns/GiftToggle";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { Stepper } from "@/ui/primitives/Stepper";
import { Text } from "@/ui/primitives/Text";
import { customerLabel, documentTitle } from "./document-model";
import type { DocumentSheetProps } from "./DocumentSheet";
import { useSheetChrome } from "./DocumentSheetFrame";
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

type DraftLine = {
  id: string;
  isNew: boolean;
  perfumeId: number | null;
  isOffCatalog: boolean;
  perfumeName: string;
  brandName: string | null;
  imageUrl: string | null;
  volumeMl: number | null;
  quantity: number;
  deliveredQuantity: number;
  price: string;
  isGift: boolean;
  /** Dernier prix saisi : restauré quand « Offert » est décoché. */
  lastPrice: string;
  cost: string;
  rate: string;
  note: string;
};

/** « 30000.00 » → « 30000 », « 277.5000 » → « 277,5 ». */
function decimalText(value: string | null): string {
  if (value === null) return "";
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "").replace(".", ",");
}

function draftOf(line: DocumentLineDTO): DraftLine {
  const price = line.isGift ? "" : amountToInputText(eurFromWire(line.unitPriceEur));
  return {
    id: line.id,
    isNew: false,
    perfumeId: line.perfumeId,
    isOffCatalog: line.isOffCatalog,
    perfumeName: line.perfumeName,
    brandName: line.brandName,
    imageUrl: line.imageUrl,
    volumeMl: line.volumeMl,
    quantity: line.quantity,
    deliveredQuantity: line.deliveredQuantity,
    price,
    isGift: line.isGift,
    lastPrice: price,
    cost: decimalText(line.unitCostDzd),
    rate: decimalText(line.exchangeRate),
    note: line.note ?? "",
  };
}

const signature = (lines: readonly DraftLine[]) =>
  JSON.stringify(lines.map(({ lastPrice: _last, imageUrl: _image, ...rest }) => ({ ...rest, price: rest.isGift ? "" : rest.price })));

/** Ce qui manque à une ligne pour être enregistrée, dans l'ordre où on le corrige. */
function missingOf(line: DraftLine): { field: "volume" | "price" | "rate"; label: string } | null {
  if (!isVolumeMl(line.volumeMl)) return { field: "volume", label: `Choisir le volume · ${line.perfumeName}` };
  const price = parseEurInput(line.price);
  if (!line.isGift && (price === null || eur.isZero(price))) {
    return { field: "price", label: `Ajouter le prix · ${line.perfumeName} ${line.volumeMl} ml` };
  }
  if (line.cost.trim() !== "" && line.rate.trim() === "") return { field: "rate", label: `Ajouter le taux · ${line.perfumeName}` };
  return null;
}

/** Messages du serveur rangés par ligne : `lines.<index>.<champ>` (contrat) ou `lines.<id>.<champ>` (writer). */
function errorsByLine(error: ActionError | null, lines: readonly DraftLine[]): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  for (const [path, message] of Object.entries(error?.fields ?? {})) {
    const match = /^lines\.([^.]+)\.(\w+)$/.exec(path);
    if (!match) continue;
    const key = match[1] as string;
    const id = /^\d+$/.test(key) ? lines[Number(key)]?.id : key;
    if (!id) continue;
    out.set(id, { ...(out.get(id) ?? {}), [match[2] as string]: message });
  }
  return out;
}

type LinesEditorProps = DocumentSheetProps & { issue: LineIssue | null; onDone: () => void };

/**
 * S01 zone 4, mode édition en place (06 S01, T2) : chaque ligne devient une carte du composeur — volume, quantité,
 * prix, « Offert », rangée repliée « Coût » (coût en dinars, taux, note de la ligne, A-12) —, « Ajouter un article »
 * (S05), « Retirer ». Quantités livrées conservées par le serveur ; réserve si une quantité passe sous le livré. La
 * sheet ne se ferme pas d'un glissement tant que l'édition dure.
 */
export function LinesEditor({ doc, recent, pickerVersion, issue, onDone }: LinesEditorProps) {
  const { showToast } = useToast();
  const initial = useMemo(() => doc.lines.map(draftOf), [doc.lines]);
  const [lines, setLines] = useState<DraftLine[]>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openCost, setOpenCost] = useState<string | null>(issue?.field === "exchangeRate" ? issue.lineId : null);
  const priceRefs = useRef(new Map<string, HTMLInputElement | null>());
  const cardRefs = useRef(new Map<string, HTMLDivElement | null>());
  const picker = useReadRoute<PickerCatalogue>(`/api/admin/picker?v=${encodeURIComponent(pickerVersion)}`);

  const dirty = signature(lines) !== signature(initial);
  const guard = useDiscardGuard(dirty);
  const save = useAction(updateDocumentAction, {
    onSuccess: () => {
      showToast({ type: "success", message: "Articles enregistrés" });
      onDone();
    },
  });
  const serverErrors = errorsByLine(save.error, lines);

  const patch = (id: string, change: Partial<DraftLine>) => setLines((current) => current.map((line) => (line.id === id ? { ...line, ...change } : line)));

  const pricingOf = (perfumeId: number | null, volumeMl: number) =>
    perfumeId === null ? undefined : picker.data?.perfumes.find((p) => p.id === perfumeId)?.pricing.find((row) => row.volumeMl === volumeMl);

  const chooseVolume = (line: DraftLine, volumeMl: number) => {
    const pricing = pricingOf(line.perfumeId, volumeMl);
    if (!pricing) {
      patch(line.id, { volumeMl });
      return;
    }
    const price = amountToInputText(eurFromWire(pricing.unitPriceEur));
    patch(line.id, {
      volumeMl,
      lastPrice: price,
      price: line.isGift ? line.price : price,
      cost: decimalText(pricing.unitCostDzd),
      rate: decimalText(pricing.exchangeRate),
    });
  };

  const remove = (line: DraftLine) => {
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
      patch(same.id, { quantity: Math.min(same.quantity + 1, MAX_LINE_QUANTITY) });
      return;
    }
    const remembered = recent.find((item) => item.perfumeId === perfume.id)?.volumeMl ?? null;
    const volumeMl = remembered ?? DEFAULT_VOLUME_ML;
    const pricing = perfume.pricing.find((row) => row.volumeMl === volumeMl);
    const price = pricing ? amountToInputText(eurFromWire(pricing.unitPriceEur)) : "";
    setLines((current) => [
      ...current,
      {
        id: newId(),
        isNew: true,
        perfumeId: perfume.id,
        isOffCatalog: false,
        perfumeName: perfume.name,
        brandName: perfume.brandName,
        imageUrl: perfume.image || null,
        volumeMl,
        quantity: 1,
        deliveredQuantity: 0,
        price,
        isGift: false,
        lastPrice: price,
        cost: decimalText(pricing?.unitCostDzd ?? null),
        rate: decimalText(pricing?.exchangeRate ?? null),
        note: "",
      },
    ]);
  };

  const firstMissing = lines.map((line) => ({ line, missing: missingOf(line) })).find((entry) => entry.missing !== null);

  const submit = () =>
    void save.run({
      documentId: doc.id,
      lines: lines.map((line) => ({
        id: line.id,
        ...(line.isNew && line.perfumeId !== null ? { item: { kind: "catalogue" as const, perfumeId: line.perfumeId } } : {}),
        volumeMl: line.volumeMl as 10 | 50 | 80,
        quantity: line.quantity,
        unitPriceEur: line.isGift ? null : line.price,
        isGift: line.isGift,
        unitCostDzd: line.cost.trim() || null,
        exchangeRate: line.rate.trim() || null,
        note: line.note.trim() || null,
      })),
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
        const errors = serverErrors.get(line.id) ?? {};
        const issueHere = issue?.lineId === line.id ? issue.message : undefined;
        const cost = parseDzdInput(line.cost);
        const rate = parseRateInput(line.rate);
        const costSummary =
          cost && rate ? `${formatDzd(cost)} · taux ${line.rate} · ${formatEur(dzdToEur(cost, rate))}` : line.cost.trim() ? "Taux à compléter" : "Coût à compléter";
        return (
          <Card key={line.id} padding={3}>
            <div ref={(el) => void cardRefs.current.set(line.id, el)} className="flex flex-col gap-3" data-edit-line={line.id}>
              <div className="flex items-start gap-3">
                <Avatar name={line.perfumeName} src={line.imageUrl} size="md" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="admin-type-body truncate font-medium text-[var(--admin-text)]">{line.perfumeName}</span>
                  <Text variant="caption" tone="muted" truncate>
                    {[line.brandName, line.deliveredQuantity > 0 ? `${line.deliveredQuantity} déjà livré${line.deliveredQuantity > 1 ? "s" : ""}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </div>
                {line.isOffCatalog ? <Badge>Hors catalogue</Badge> : null}
              </div>

              <div className="flex flex-col gap-1" role="group" aria-label={`Volume de ${line.perfumeName}`}>
                <div className="flex flex-wrap gap-2">
                  {VOLUMES_ML.map((volume) => (
                    <Chip key={volume} active={line.volumeMl === volume} onClick={() => chooseVolume(line, volume)}>
                      {volume} ml
                    </Chip>
                  ))}
                </div>
                {!isVolumeMl(line.volumeMl) ? (
                  <Text variant="caption" tone="warning">
                    {errors.volumeMl ?? (issue?.field === "volumeMl" ? issueHere : undefined) ?? "Volume à choisir"}
                  </Text>
                ) : errors.volumeMl ? (
                  <Text variant="caption" tone="danger">
                    {errors.volumeMl}
                  </Text>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stepper
                  value={line.quantity}
                  min={1}
                  max={MAX_LINE_QUANTITY}
                  onChange={(quantity) => patch(line.id, { quantity })}
                  ariaLabel={`Quantité de ${line.perfumeName}`}
                  decrementAtMin={
                    lines.length > 1
                      ? { icon: <Trash2 size={16} />, ariaLabel: `Retirer ${line.perfumeName}`, onPress: () => remove(line) }
                      : undefined
                  }
                />
                <GiftToggle
                  checked={line.isGift}
                  onChange={(checked) => patch(line.id, checked ? { isGift: true, lastPrice: line.price } : { isGift: false, price: line.lastPrice })}
                />
              </div>

              {!line.isGift ? (
                <FormField
                  label={`Prix de ${line.perfumeName}`}
                  error={errors.unitPriceEur ?? (issue?.field === "unitPriceEur" ? issueHere : undefined)}
                >
                  {(field) => (
                    <MoneyInput
                      ref={(el) => void priceRefs.current.set(line.id, el)}
                      {...field}
                      value={line.price}
                      onChange={(price) => patch(line.id, { price, lastPrice: price })}
                      enterKeyHint="next"
                    />
                  )}
                </FormField>
              ) : null}

              <CollapsibleSection
                key={`${line.id}-${openCost === line.id ? "ouvert" : "replie"}`}
                title="Coût et note"
                summary={line.note.trim() ? `${costSummary} · ${line.note.trim()}` : costSummary}
                defaultOpen={openCost === line.id || Boolean(errors.exchangeRate || errors.unitCostDzd)}
                bare
              >
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label={`Coût en dinars de ${line.perfumeName}`} error={errors.unitCostDzd}>
                      {(field) => (
                        <Input {...field} inputMode="decimal" numeric value={line.cost} onChange={(e) => patch(line.id, { cost: e.target.value })} enterKeyHint="next" />
                      )}
                    </FormField>
                    <FormField
                      label={`Taux de ${line.perfumeName}`}
                      error={errors.exchangeRate ?? (issue?.field === "exchangeRate" ? issueHere : undefined)}
                    >
                      {(field) => (
                        <Input {...field} inputMode="decimal" numeric value={line.rate} onChange={(e) => patch(line.id, { rate: e.target.value })} enterKeyHint="next" />
                      )}
                    </FormField>
                  </div>
                  <FormField label={`Note de ${line.perfumeName}`} error={errors.note}>
                    {(field) => (
                      <Input {...field} value={line.note} onChange={(e) => patch(line.id, { note: e.target.value })} maxLength={500} enterKeyHint="done" />
                    )}
                  </FormField>
                </div>
              </CollapsibleSection>
            </div>
          </Card>
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
      />
    </div>
  );
}
