"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Heading } from "@/ui/primitives/Heading";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Divider } from "@/ui/primitives/Divider";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { SkeletonList } from "@/ui/primitives/Skeleton";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { FormSection } from "@/ui/patterns/FormSection";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";
import { ImageField } from "@/ui/patterns/ImageField";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { readJsonSafe } from "@/lib/admin/http";
import { cn } from "@/lib/utils";

type CatalogMode = "CURATED" | "COMPLETE";
type Status = "PUBLISHED" | "DRAFT";

type BrandPayload = {
  id: string;
  name: string;
  catalogMode: CatalogMode;
  status: Status;
  image: string | null;
  imageLight: string | null;
};

const MODE_OPTIONS: ReadonlyArray<{
  value: CatalogMode;
  label: string;
  description: string;
}> = [
  {
    value: "CURATED",
    label: "Sélection",
    description: "Seuls les parfums que tu ajoutes apparaissent, un par un.",
  },
  {
    value: "COMPLETE",
    label: "Gamme complète",
    description: "La marque apparaît en une seule entrée. Image obligatoire.",
  },
];

const STATUS_OPTIONS = [
  { value: "PUBLISHED" as const, label: "Visible" },
  { value: "DRAFT" as const, label: "Masquée" },
];

const BRANDS_HREF = "/admin/catalogue?tab=brands";

export function BrandForm({ brandId }: { brandId?: string }) {
  const router = useRouter();
  const isNew = !brandId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("CURATED");
  const [status, setStatus] = useState<Status>("PUBLISHED");
  const [image, setImage] = useState("");
  const [imageLight, setImageLight] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? readJsonSafe<{ user?: { role?: string } }>(r) : null))
      .then((j) => {
        if (j?.user?.role === "VIEWER") setReadOnly(true);
      });
  }, []);

  useEffect(() => {
    if (isNew || !brandId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/brands/${brandId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await readJsonSafe<{ error?: string; brand?: BrandPayload }>(res);
        if (!res.ok) throw new Error(json?.error ?? "Cette marque n'a pas pu être chargée.");
        if (cancelled || !json?.brand) return;
        setName(json.brand.name);
        setCatalogMode(json.brand.catalogMode);
        setStatus(json.brand.status);
        setImage(json.brand.image ?? "");
        setImageLight(json.brand.imageLight ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, brandId]);

  /** Une gamme complète n'a aucun parfum à afficher : son image EST la vitrine. */
  const imageRequired = catalogMode === "COMPLETE";
  const imageMissing = image.trim() === "";
  const publicationLocked = imageRequired && imageMissing;

  const buildPayload = useCallback(
    (overrides: Partial<BrandPayload> = {}) => ({
      name: name.trim(),
      catalogMode,
      status: publicationLocked ? "DRAFT" : status,
      image: image.trim() || null,
      imageLight: imageLight.trim() || null,
      ...overrides,
    }),
    [name, catalogMode, status, image, imageLight, publicationLocked],
  );

  const autoSave = useCallback(
    async (overrides: Partial<BrandPayload>) => {
      if (isNew || readOnly || saving) return;
      try {
        const res = await fetch(`/api/admin/brands/${brandId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(overrides)),
        });
        if (!res.ok) {
          const json = await readJsonSafe<{ error?: string }>(res);
          throw new Error(json?.error ?? "L'image n'a pas pu être enregistrée.");
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enregistrement automatique échoué.");
      }
    },
    [isNew, readOnly, saving, brandId, buildPayload, router],
  );

  const canSubmit = !readOnly && name.trim() !== "" && !(imageRequired && imageMissing);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/brands" : `/api/admin/brands/${brandId}`, {
        method: isNew ? "POST" : "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = await readJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "Enregistrement refusé.");
      router.push(BRANDS_HREF);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!brandId || readOnly) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await readJsonSafe<{ error?: string }>(res);
        throw new Error(json?.error ?? "Suppression refusée.");
      }
      router.push(BRANDS_HREF);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible.");
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <PageScaffold ariaLabel="Chargement de la marque">
        <SkeletonList count={4} />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold padding={4} ariaLabel={isNew ? "Nouvelle marque" : "Fiche marque"} formScroll>
      <form id="brand-form" onSubmit={onSubmit}>
        <Stack gap={4}>
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Heading level={1}>{isNew ? "Nouvelle marque" : name || "Sans nom"}</Heading>
              {isNew ? (
                <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
                  Le nom suffit pour créer la marque.
                </p>
              ) : null}
            </div>
            {!isNew ? (
              <Badge tone={status === "PUBLISHED" ? "success" : "neutral"} size="md" dot>
                {status === "PUBLISHED" ? "Visible" : "Masquée"}
              </Badge>
            ) : null}
          </header>

          <ErrorBanner message={error} />

          <FormSection title="Identité">
            <Input
              label="Nom de la marque"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              required
              enterKeyHint="done"
              placeholder="Ex : Yves Saint Laurent"
            />
          </FormSection>

          <FormSection
            title="Mode catalogue"
            description="Détermine comment la marque apparaît sur le site."
          >
            {MODE_OPTIONS.map((opt) => {
              const active = catalogMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={readOnly}
                  onClick={() => setCatalogMode(opt.value)}
                  className={cn(
                    "flex min-h-[var(--admin-touch-min)] w-full items-start gap-3 rounded-[12px] p-3 text-left tap-scale",
                    "transition-colors duration-[var(--admin-duration-fast)] ease-[var(--admin-easing-default)]",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
                    "disabled:opacity-50",
                  )}
                  style={{
                    background: active ? "var(--admin-accent-bg)" : "var(--admin-surface-muted)",
                    border: `1px solid ${active ? "var(--admin-accent)" : "transparent"}`,
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[15px] font-semibold leading-tight",
                        active ? "text-[var(--admin-accent)]" : "text-[var(--admin-text)]",
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-[var(--admin-text-muted)]">
                      {opt.description}
                    </span>
                  </span>
                  {active ? (
                    <Check
                      size={17}
                      className="mt-0.5 shrink-0 text-[var(--admin-accent)]"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </FormSection>

          <FormSection title="Visuels">
            <ImageField
              label="Logo"
              hint={
                imageRequired
                  ? "Obligatoire en gamme complète : c'est la seule image affichée."
                  : "Optionnel. WebP recommandé."
              }
              aspect="square"
              value={image}
              onChange={setImage}
              onCommit={(url) => void autoSave({ image: url })}
              onError={setError}
              readOnly={readOnly}
            />
            <Divider />
            <ImageField
              label="Variante claire"
              hint="Optionnelle : utilisée sur fond clair."
              aspect="square"
              value={imageLight}
              onChange={setImageLight}
              onCommit={(url) => void autoSave({ imageLight: url })}
              onError={setError}
              readOnly={readOnly}
            />
          </FormSection>

          <FormSection
            title="Visibilité"
            description={
              publicationLocked
                ? "Ajoute un logo pour publier une gamme complète."
                : undefined
            }
          >
            <SegmentedControl
              options={STATUS_OPTIONS}
              value={publicationLocked ? "DRAFT" : status}
              onChange={(v) => {
                if (publicationLocked || readOnly) return;
                setStatus(v);
              }}
              ariaLabel="Visibilité de la marque"
              className={publicationLocked ? "pointer-events-none opacity-50" : undefined}
            />
          </FormSection>

          {!isNew && !readOnly ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="text"
                size="sm"
                leadingIcon={<Trash2 size={15} />}
                onClick={() => setConfirmDelete(true)}
                className="text-[var(--admin-danger)]"
              >
                Supprimer cette marque
              </Button>
            </div>
          ) : null}
        </Stack>

        <StickyAction>
          <Button
            type="submit"
            form="brand-form"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={saving}
            disabled={!canSubmit}
          >
            {isNew ? "Créer la marque" : "Enregistrer"}
          </Button>
        </StickyAction>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cette marque ?"
        description={`« ${name || "Sans nom"} » et tous ses parfums seront supprimés.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
      />
    </PageScaffold>
  );
}
