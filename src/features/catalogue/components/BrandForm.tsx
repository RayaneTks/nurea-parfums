"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import type { AdminBrandRow, BrandSheet } from "@/contracts/catalogue";
import { canPublishBrand, type BrandCatalogMode, type PublicationStatus } from "@/domain/publication";
import { normaliseMarque, trouveParNom } from "@/lib/nommage";
import { brandPublicUrl } from "@/lib/vitrine-links";
import { cn } from "@/lib/utils";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { routes } from "@/app-shell/routes";
import { useUndo } from "@/app-shell/UndoProvider";
import { createBrandAction, deleteBrandAction, setBrandVisibilityAction, updateBrandAction } from "@/server/catalogue/actions";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { FormField } from "@/ui/patterns/FormField";
import { FormSection } from "@/ui/patterns/FormSection";
import { ImageField } from "@/ui/patterns/ImageField";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { ListRow } from "@/ui/primitives/ListRow";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Switch } from "@/ui/primitives/Switch";
import { ExistingBrandNotice } from "./BrandSelectSheet";
import { pendingRemovals } from "./pending-removals";
import { useRepublishOffer } from "./useBrandVisibility";
import { useImageUpload } from "./useImageUpload";
import { useLeaveGuard } from "./useLeaveGuard";

export type BrandFormProps = {
  /** Absent : création. */
  sheet: BrandSheet | null;
  /** Toutes les marques : dédoublonnage à la saisie du nom. */
  brands: readonly AdminBrandRow[];
};

const MODES: readonly { value: BrandCatalogMode; title: string; description: string }[] = [
  { value: "CURATED", title: "Sélection", description: "Seuls les parfums publiés apparaissent." },
  { value: "COMPLETE", title: "Gamme complète", description: "Une carte unique avec le logo." },
];

/** « Ses 14 parfums » ; 1 : « Son parfum ». */
function perfumesText(count: number): string {
  return count === 1 ? "son parfum" : `ses ${count} parfums`;
}

/**
 * E17 — Formulaire marque (06 §3.5) : logo SANS recadrage (proportions d'origine, règle projet), nom
 * dédoublonné, mode, visibilité, lien public stable au renommage. Masquer ou passer en gamme complète
 * masque ses parfums : la réserve du domaine s'affiche avant d'écrire (T14).
 */
export function BrandForm({ sheet, brands }: BrandFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { scheduleDelete } = useUndo();
  const { uploadCatalogueImage } = useImageUpload();
  const offerRepublish = useRepublishOffer();
  const current = sheet?.brand ?? null;

  const initial = useMemo(
    () => ({
      name: current?.name ?? "",
      catalogMode: current?.catalogMode ?? ("CURATED" as BrandCatalogMode),
      status: current?.status ?? ("PUBLISHED" as PublicationStatus),
      image: current?.image ?? "",
      imageLight: current?.imageLight ?? "",
    }),
    [current],
  );
  const [name, setName] = useState(initial.name);
  const [catalogMode, setCatalogMode] = useState<BrandCatalogMode>(initial.catalogMode);
  const [status, setStatus] = useState<PublicationStatus>(initial.status);
  const [image, setImage] = useState(initial.image);
  const [imageLight, setImageLight] = useState(initial.imageLight);
  const [saved, setSaved] = useState({ image: initial.image, imageLight: initial.imageLight });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const dirty =
    name !== initial.name ||
    catalogMode !== initial.catalogMode ||
    status !== initial.status ||
    image !== saved.image ||
    imageLight !== saved.imageLight;
  const guard = useLeaveGuard(dirty);

  const create = useAction(createBrandAction, { success: (data) => `${data.name} ajoutée` });
  const update = useAction(updateBrandAction, { success: "Marque enregistrée" });
  const autoSave = useAction(updateBrandAction, { success: "Logo enregistré", errors: "inline" });
  const hide = useAction(setBrandVisibilityAction, { success: (data) => `${data.brand.name} masquée` });
  const remove = useAction(deleteBrandAction, { errors: "inline" });
  const error = create.error ?? update.error;
  const fields = error?.code === "VALIDATION" ? error.fields : undefined;

  const trimmed = name.trim();
  const twin = trimmed.length >= 2 ? trouveParNom(brands.filter((brand) => brand.id !== current?.id), (brand) => brand.name, trimmed) : undefined;
  const normalised = trimmed === "" ? "" : normaliseMarque(trimmed);
  const publishVerdict = canPublishBrand({ catalogMode, image });
  const cta = trimmed === "" ? "Saisir le nom" : current ? "Enregistrer" : twin ? `Ouvrir ${twin.name}` : "Ajouter la marque";

  const commitImage = async (key: "image" | "imageLight", url: string) => {
    if (!current) return;
    const result = await autoSave.run(
      key === "image" ? { id: current.id, image: url || null, confirm: false } : { id: current.id, imageLight: url || null, confirm: false },
    );
    if (result.ok) setSaved((previous) => ({ ...previous, [key]: url }));
    else showToast({ type: "error", message: result.error.fields?.[key] ?? result.error.message });
  };

  const submit = async () => {
    if (trimmed === "") {
      nameRef.current?.focus();
      return;
    }
    if (!current) {
      if (twin) {
        guard.release();
        router.push(routes.modifierMarque(twin.id));
        return;
      }
      const result = await create.run({ name, catalogMode, status, image: image || null, imageLight: imageLight || null });
      if (result.ok) {
        guard.release();
        router.push(routes.catalogue({ tab: "marques" }));
      }
      return;
    }
    const result = await update.run({
      id: current.id,
      name,
      catalogMode,
      status,
      image: image || null,
      imageLight: imageLight || null,
      confirm: false,
    });
    if (!result.ok) return;
    guard.release();
    const republish =
      result.data.republishable > 0 && (initial.status !== "PUBLISHED" || initial.catalogMode !== "CURATED") ? result.data.republishable : 0;
    if (republish > 0) await offerRepublish(result.data.brand, republish);
    router.push(routes.catalogue({ tab: "marques" }));
  };

  const deleteNow = () => {
    if (!current) return;
    const key = `marque:${current.id}` as const;
    setConfirmDelete(false);
    pendingRemovals.add(key);
    scheduleDelete({
      message: `${current.name} supprimée`,
      onUndo: () => pendingRemovals.remove(key),
      onCommit: async () => {
        const result = await remove.run({ id: current.id });
        pendingRemovals.remove(key);
        if (!result.ok) showToast({ type: "error", message: result.error.message });
      },
    });
    guard.release();
    router.push(routes.catalogue({ tab: "marques" }));
  };

  const copyLink = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(brandPublicUrl(current.slug));
      showToast({ type: "success", message: "Lien copié" });
    } catch {
      showToast({ type: "error", message: "Copie impossible : sélectionne le lien pour le copier." });
    }
  };

  const perfumeCount = sheet?.perfumeCount ?? 0;

  return (
    <>
      <FormSection title="Logo" description="Gardé tel quel, jamais recadré. Obligatoire pour une gamme complète.">
        <ImageField
          label="Logo"
          kind="logo"
          value={image}
          onChange={setImage}
          upload={uploadCatalogueImage}
          onCommit={current ? (url) => void commitImage("image", url) : undefined}
        />
        <CollapsibleSection bare title="Variante claire" summary={imageLight ? "Ajoutée" : "Facultative"} defaultOpen={imageLight !== ""}>
          <ImageField
            label="Logo, variante claire"
            hint="Affiché sur la vitrine en mode clair."
            kind="logo"
            value={imageLight}
            onChange={setImageLight}
            upload={uploadCatalogueImage}
            onCommit={current ? (url) => void commitImage("imageLight", url) : undefined}
          />
        </CollapsibleSection>
      </FormSection>

      <FormSection title="Nom">
        <FormField
          label="Nom de la marque"
          error={fields?.name}
          hint={!twin && normalised !== "" && normalised !== trimmed ? `Sera enregistré : ${normalised}` : undefined}
        >
          {(field) => (
            <Input
              {...field}
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              variant="elevated"
              placeholder="Dior"
            />
          )}
        </FormField>
        {twin ? (
          <ExistingBrandNotice>
            {twin.name} existe déjà.{" "}
            <button
              type="button"
              className="admin-hit-target font-semibold underline underline-offset-2"
              onClick={() => {
                guard.release();
                router.push(routes.modifierMarque(twin.id));
              }}
            >
              Ouvrir
            </button>
          </ExistingBrandNotice>
        ) : null}
      </FormSection>

      <FormSection title="Mode">
        <div role="radiogroup" aria-label="Mode de la marque" className="flex flex-col gap-2">
          {MODES.map((mode) => {
            const checked = catalogMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setCatalogMode(mode.value)}
                className={cn(
                  "tap-scale flex min-h-[var(--admin-touch-comfortable)] w-full items-start gap-3 rounded-[var(--admin-radius-md)] border px-3 py-2.5 text-left",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
                  checked ? "border-[var(--admin-accent)] bg-[var(--admin-accent-bg)]" : "border-[var(--admin-border-strong)] bg-[var(--admin-surface)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--admin-radius-full)] border-2",
                    checked ? "border-[var(--admin-accent)]" : "border-[var(--admin-border-strong)]",
                  )}
                >
                  {checked ? <span className="h-2.5 w-2.5 rounded-[var(--admin-radius-full)] bg-[var(--admin-accent)]" /> : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="admin-type-body font-medium text-[var(--admin-text)]">{mode.title}</span>
                  <span className="admin-type-caption text-[var(--admin-text-muted)]">{mode.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Vitrine">
        <Switch
          checked={status === "PUBLISHED"}
          label="Visible"
          disabled={status !== "PUBLISHED" && !publishVerdict.ok}
          disabledReason={publishVerdict.ok ? undefined : publishVerdict.message}
          description={
            status === "PUBLISHED"
              ? catalogMode === "COMPLETE"
                ? "Une carte avec le logo sur le site."
                : "Ses parfums publiés apparaissent sur le site."
              : perfumeCount > 0
                ? `Masquée : ${perfumesText(perfumeCount)} aussi.`
                : "Masquée : absente du site."
          }
          onCheckedChange={(next) => setStatus(next ? "PUBLISHED" : "DRAFT")}
        />
        {current ? (
          <div className="flex flex-col">
            <span className="admin-type-caption mb-1.5 font-medium text-[var(--admin-text-muted)]">Lien public</span>
            <div className="flex items-center gap-2">
              <p className="admin-type-caption min-w-0 flex-1 select-all truncate text-[var(--admin-text)]" data-leave-guard-ignore>
                {brandPublicUrl(current.slug)}
              </p>
              <Button variant="secondary" size="sm" leadingIcon={<Copy size={14} />} onClick={() => void copyLink()}>
                Copier
              </Button>
            </div>
          </div>
        ) : null}
      </FormSection>

      {current ? (
        <Card padding={0}>
          <ListRow
            href={routes.catalogue({ q: current.name })}
            primary="Parfums de la marque"
            trailing={<span className="admin-type-body tnum text-[var(--admin-text-muted)]">{perfumeCount}</span>}
            chevron
          />
        </Card>
      ) : null}

      {current ? (
        <Button variant="text" leadingIcon={<Trash2 size={16} />} className="self-center text-[var(--admin-danger)]" onClick={() => setConfirmDelete(true)}>
          Supprimer la marque
        </Button>
      ) : null}

      <StickyAction>
        <Button variant="primary" size="lg" fullWidth isLoading={create.pending || update.pending} onClick={() => void submit()}>
          {cta}
        </Button>
      </StickyAction>

      {current ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={perfumeCount > 0 ? `Supprimer ${current.name} et ${perfumesText(perfumeCount)} ?` : `Supprimer ${current.name} ?`}
          description={`${perfumeCount > 0 ? "Ils disparaissent de la vitrine." : "Elle disparaît de la vitrine."} Les ventes passées gardent leurs noms. Tu pourras annuler pendant 5 secondes.`}
          confirmLabel="Supprimer"
          tone="danger"
          onConfirm={deleteNow}
          alternative={
            current.status === "PUBLISHED"
              ? {
                  label: "Masquer plutôt",
                  onAction: () => {
                    setConfirmDelete(false);
                    void hide.run({ id: current.id, status: "DRAFT", confirm: false });
                  },
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}
