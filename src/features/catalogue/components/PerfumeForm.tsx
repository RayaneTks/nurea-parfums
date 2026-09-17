"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { AdminBrandRow, PricingRow } from "@/contracts/catalogue";
import type { PublicationStatus } from "@/domain/publication";
import type { VolumeMl } from "@/domain/sale-line";
import { cleNom, normaliseParfum } from "@/lib/nommage";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { routes } from "@/app-shell/routes";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useUndo } from "@/app-shell/UndoProvider";
import {
  createPerfumeAction,
  deletePerfumeAction,
  setPerfumeStatusAction,
  updatePerfumeAction,
} from "@/server/catalogue/actions";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";
import { FormField } from "@/ui/patterns/FormField";
import { FormSection } from "@/ui/patterns/FormSection";
import { ImageField } from "@/ui/patterns/ImageField";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { ListRow } from "@/ui/primitives/ListRow";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { BrandSelectSheet, ExistingBrandNotice, type BrandChoice } from "./BrandSelectSheet";
import { CatalogueThumb } from "./CatalogueThumb";
import { storyCountLabel } from "./catalogue-model";
import { pendingRemovals } from "./pending-removals";
import { draftsFrom, pricingErrors, pricingInput, sameDrafts, type PricingDraft, type PricingDrafts } from "./pricing-model";
import { PricingFields } from "./PricingFields";
import { useImageUpload } from "./useImageUpload";
import { useLeaveGuard } from "./useLeaveGuard";

export type PerfumeFormProps =
  | {
      mode: "create";
      brands: readonly AdminBrandRow[];
      recentBrandIds: readonly string[];
      defaultExchangeRate: string;
      /** « Dupliquer » : marque et tarifs repris, nom et visuels vides. */
      initialBrand: BrandChoice | null;
      initialPricing: readonly PricingRow[];
      duplicatedFrom: string | null;
    }
  | {
      mode: "edit";
      brands: readonly AdminBrandRow[];
      recentBrandIds: readonly string[];
      defaultExchangeRate: string;
      perfume: {
        id: number;
        name: string;
        image: string;
        imageLight: string | null;
        status: PublicationStatus;
        mediaCount: number;
        brand: Extract<BrandChoice, { kind: "existing" }>["brand"];
      };
      initialPricing: readonly PricingRow[];
    };

function brandRef(choice: BrandChoice) {
  return choice.kind === "existing" ? { kind: "existing" as const, brandId: choice.brand.id } : { kind: "new" as const, name: choice.name };
}

function sameBrand(a: BrandChoice | null, b: BrandChoice | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === "existing" && b.kind === "existing") return a.brand.id === b.brand.id;
  return a.kind === "new" && b.kind === "new" && a.name === b.name;
}

/** Texte du CTA qui guide vers ce qui manque (06 arbitrage n°9, E19). */
export function perfumeCta(mode: "create" | "edit", brand: BrandChoice | null, name: string): string {
  if (!brand) return "Choisir la marque";
  if (name.trim() === "") return "Saisir le nom";
  return mode === "create" ? "Ajouter au catalogue" : "Enregistrer";
}

/**
 * E19 — Formulaire parfum (06 §3.5) : créer un parfum en moins de 90 s, modifier fiche ET tarifs en UN
 * enregistrement (A-6). Le stock n'y est pas (S20 depuis la fiche). En modification, un visuel envoyé est
 * enregistré aussitôt (02 §4.5) : une photo perdue parce qu'on quitte l'écran est un travail à refaire.
 */
export function PerfumeForm(props: PerfumeFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { scheduleDelete } = useUndo();
  const { uploadCatalogueImage } = useImageUpload();
  const editing = props.mode === "edit" ? props.perfume : null;

  const initialBrand: BrandChoice | null = editing ? { kind: "existing", brand: editing.brand } : props.mode === "create" ? props.initialBrand : null;
  const initialDrafts = useMemo(() => draftsFrom(props.initialPricing), [props.initialPricing]);

  const [brand, setBrand] = useState<BrandChoice | null>(initialBrand);
  const [brandNotice, setBrandNotice] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState("");
  const [brandSheetOpen, setBrandSheetOpen] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [image, setImage] = useState(editing?.image ?? "");
  const [imageLight, setImageLight] = useState(editing?.imageLight ?? "");
  const [saved, setSaved] = useState({ image: editing?.image ?? "", imageLight: editing?.imageLight ?? "" });
  const [drafts, setDrafts] = useState<PricingDrafts>(initialDrafts);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useShellSheet(brandSheetOpen, () => setBrandSheetOpen(false));

  const dirty =
    !sameBrand(brand, initialBrand) ||
    name !== (editing?.name ?? "") ||
    image !== saved.image ||
    imageLight !== saved.imageLight ||
    !sameDrafts(drafts, initialDrafts);
  const guard = useLeaveGuard(dirty);

  const { volumes } = pricingInput(drafts);
  const create = useAction(createPerfumeAction, { success: (data) => `${data.name} ajouté` });
  const update = useAction(updatePerfumeAction, { success: "Modifications enregistrées" });
  const autoSave = useAction(updatePerfumeAction, { success: "Visuel enregistré", errors: "inline" });
  const hide = useAction(setPerfumeStatusAction, { success: (data) => `${data.name} masqué` });
  const remove = useAction(deletePerfumeAction, { errors: "inline" });
  const error = create.error ?? update.error;
  const fields = error?.code === "VALIDATION" ? error.fields : undefined;
  const volumeErrors = pricingErrors(fields, volumes);

  const normalised = name.trim() === "" ? "" : normaliseParfum(name);
  const cta = perfumeCta(props.mode, brand, name);

  const setDraft = (volume: VolumeMl, draft: PricingDraft) => setDrafts((previous) => ({ ...previous, [volume]: draft }));

  const commitImage = async (key: "image" | "imageLight", url: string) => {
    if (!editing) return;
    const result = await autoSave.run(key === "image" ? { id: editing.id, image: url } : { id: editing.id, imageLight: url || null });
    if (result.ok) {
      setSaved((previous) => ({ ...previous, [key]: url }));
    } else {
      showToast({ type: "error", message: result.error.fields?.[key] ?? result.error.message });
    }
  };

  const submit = async () => {
    if (!brand) {
      setBrandSheetOpen(true);
      return;
    }
    if (name.trim() === "") {
      nameRef.current?.focus();
      return;
    }
    const { entries } = pricingInput(drafts);
    if (editing) {
      const result = await update.run({
        id: editing.id,
        brand: brandRef(brand),
        name,
        image,
        imageLight: imageLight || null,
        pricing: entries,
      });
      if (result.ok) {
        guard.release();
        router.push(routes.parfum(editing.id));
      }
      return;
    }
    const result = await create.run({ brand: brandRef(brand), name, image, imageLight: imageLight || null, pricing: entries });
    if (result.ok) {
      guard.release();
      router.push(routes.parfum(result.data.id));
    }
  };

  const deleteNow = () => {
    if (!editing) return;
    const key = `parfum:${editing.id}` as const;
    setConfirmDelete(false);
    pendingRemovals.add(key);
    scheduleDelete({
      message: `${editing.name} supprimé`,
      onUndo: () => pendingRemovals.remove(key),
      onCommit: async () => {
        const result = await remove.run({ id: editing.id });
        pendingRemovals.remove(key);
        if (!result.ok) showToast({ type: "error", message: result.error.message });
      },
    });
    guard.release();
    router.push(routes.catalogue());
  };

  const deleteDescription = editing
    ? [
        "Il disparaît de la vitrine immédiatement. Les ventes passées gardent son nom.",
        editing.mediaCount > 0 ? `Ses ${storyCountLabel(editing.mediaCount)} sont supprimés aussi.` : null,
        "Tu pourras annuler pendant 5 secondes.",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const brandLabel = brand ? (brand.kind === "existing" ? brand.brand.name : brand.name) : null;

  return (
    <>
      <FormSection title="Visuel" description="Photo du flacon, recadrée en portrait. Sans visuel, le parfum reste masqué.">
        <ImageField
          label="Visuel principal"
          kind="perfume"
          value={image}
          onChange={setImage}
          upload={uploadCatalogueImage}
          onCommit={editing ? (url) => void commitImage("image", url) : undefined}
        />
        <CollapsibleSection bare title="Variante claire" summary={imageLight ? "Ajoutée" : "Facultative"} defaultOpen={imageLight !== ""}>
          <ImageField
            label="Variante claire"
            hint="Affichée sur la vitrine en mode clair."
            kind="perfume"
            value={imageLight}
            onChange={setImageLight}
            upload={uploadCatalogueImage}
            onCommit={editing ? (url) => void commitImage("imageLight", url) : undefined}
          />
        </CollapsibleSection>
        {autoSave.error ? <ErrorBanner message={autoSave.error.message} /> : null}
      </FormSection>

      <FormSection title="Identité">
        <div className="flex flex-col">
          <span className="admin-type-caption mb-1.5 font-medium text-[var(--admin-text-muted)]">Marque</span>
          <Card padding={0} elevated={false} className={fields?.brand || fields?.["brand.name"] ? "border-[var(--admin-danger)]" : undefined}>
            <ListRow
              onClick={() => setBrandSheetOpen(true)}
              ariaLabel={brandLabel ? `Marque : ${brandLabel}. Changer` : "Choisir la marque"}
              leading={brand?.kind === "existing" ? <CatalogueThumb src={brand.brand.image} name={brand.brand.name} size={40} /> : undefined}
              primary={
                brandLabel ? (
                  <span className="admin-type-body block truncate font-medium text-[var(--admin-text)]">{brandLabel}</span>
                ) : (
                  <span className="admin-type-body block truncate text-[var(--admin-text-subtle)]">Choisir la marque</span>
                )
              }
              secondary={brand?.kind === "new" ? "Nouvelle marque, créée avec le parfum" : undefined}
              chevron
            />
          </Card>
          {fields?.brand || fields?.["brand.name"] ? (
            <p className="admin-type-caption mt-1.5 font-medium text-[var(--admin-danger)]">{fields.brand ?? fields["brand.name"]}</p>
          ) : null}
          {brandNotice ? (
            <div className="mt-2">
              <ExistingBrandNotice>{brandNotice}</ExistingBrandNotice>
            </div>
          ) : null}
        </div>
        <FormField
          label="Nom du parfum"
          error={fields?.name}
          hint={normalised !== "" && normalised !== name.trim() ? `Sera enregistré : ${normalised}` : undefined}
        >
          {(field) => (
            <Input
              {...field}
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              variant="elevated"
              placeholder="Sauvage"
            />
          )}
        </FormField>
      </FormSection>

      <PricingFields drafts={drafts} onChange={setDraft} errors={volumeErrors} defaultRate={props.defaultExchangeRate} />

      {editing ? (
        <Button variant="text" leadingIcon={<Trash2 size={16} />} className="self-center text-[var(--admin-danger)]" onClick={() => setConfirmDelete(true)}>
          Supprimer le parfum
        </Button>
      ) : null}

      <StickyAction summary={props.mode === "create" && props.duplicatedFrom ? `Copie de ${props.duplicatedFrom} : marque et tarifs repris` : undefined}>
        <Button variant="primary" size="lg" fullWidth isLoading={create.pending || update.pending} onClick={() => void submit()}>
          {cta}
        </Button>
      </StickyAction>

      <BrandSelectSheet
        open={brandSheetOpen}
        onOpenChange={setBrandSheetOpen}
        brands={props.brands}
        recentIds={props.recentBrandIds}
        value={brand}
        query={brandQuery}
        onQueryChange={setBrandQuery}
        onSelect={(choice) => {
          setBrand(choice);
          const typed = brandQuery.trim();
          setBrandNotice(
            choice.kind === "existing" && typed !== choice.brand.name && cleNom(typed) !== "" && cleNom(typed) === cleNom(choice.brand.name)
              ? `Rattaché à ${choice.brand.name}, déjà au catalogue.`
              : null,
          );
          if (name.trim() === "") window.setTimeout(() => nameRef.current?.focus(), 350);
        }}
      />

      {editing ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Supprimer ${editing.name} ?`}
          description={deleteDescription}
          confirmLabel="Supprimer"
          tone="danger"
          onConfirm={deleteNow}
          alternative={
            editing.status === "PUBLISHED"
              ? {
                  label: "Masquer plutôt",
                  onAction: () => {
                    setConfirmDelete(false);
                    void hide.run({ id: editing.id, status: "DRAFT" });
                  },
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}
