"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { BrandPicker, type BrandOption } from "./BrandPicker";

type PerfumePayload = {
  id: number;
  brandId: string;
  name: string;
  image: string;
  imageLight: string | null;
  status: string;
  stock?: number;
};

const STATUS_OPTIONS = [
  { value: "PUBLISHED" as const, label: "Visible" },
  { value: "DRAFT" as const, label: "Masqué" },
];

const CATALOGUE_HREF = "/admin/catalogue";

/**
 * Fiche parfum — création et édition.
 *
 * Trois différences par rapport à la version précédente :
 *   - le titre et le bouton retour viennent du shell, plus d'en-tête maison ;
 *   - le CTA passe par `StickyAction` au lieu d'un `fixed` calé sur une
 *     hauteur de barre d'onglets codée en dur (qui se désalignait dès que la
 *     barre changeait) ;
 *   - le garde-fou « gamme complète » utilise une boîte de dialogue du thème
 *     et non `window.confirm`, que iOS affiche hors du cadre de l'app.
 */
type PerfumeFormProps = {
  perfumeId?: string;
  /**
   * Grille tarifaire, chargée côté serveur par la route.
   *
   * Passée en slot pour être rendue DANS le scaffold du formulaire. Empilée en
   * frère à côté de lui, elle créait un second bloc de niveau page dans le même
   * conteneur de défilement : deux `<main>`, deux flux, et la grille finissait
   * posée par-dessus la carte des visuels.
   */
  pricingSlot?: ReactNode;
};

export function PerfumeForm({ perfumeId, pricingSlot }: PerfumeFormProps) {
  const router = useRouter();
  const isNew = !perfumeId;

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [imageLight, setImageLight] = useState("");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");
  const [stock, setStock] = useState("0");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/brands", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? readJsonSafe<{ brands: BrandOption[] }>(r) : null))
      .then((j) => setBrands(j?.brands ?? []));
  }, []);

  useEffect(() => {
    void fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? readJsonSafe<{ user?: { role?: string } }>(r) : null))
      .then((j) => {
        if (j?.user?.role === "VIEWER") setReadOnly(true);
      });
  }, []);

  useEffect(() => {
    if (isNew || !perfumeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/perfumes/${perfumeId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await readJsonSafe<{ error?: string; perfume?: PerfumePayload }>(res);
        if (!res.ok) throw new Error(json?.error ?? "Ce parfum n'a pas pu être chargé.");
        if (cancelled || !json?.perfume) return;
        const p = json.perfume;
        setBrandId(p.brandId);
        setName(p.name);
        setImage(p.image);
        setImageLight(p.imageLight ?? "");
        setStatus(p.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
        setStock(String(p.stock ?? 0));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, perfumeId]);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === brandId),
    [brands, brandId],
  );
  const brandIsComplete = selectedBrand?.catalogMode === "COMPLETE";
  const brandIsHidden = selectedBrand?.status === "DRAFT";
  /** Un parfum ne peut pas être plus visible que sa marque. */
  const publicationLocked = brandIsComplete || brandIsHidden || image.trim() === "";

  const buildBody = useCallback(
    (overrides: Partial<PerfumePayload> & { allowCompleteOverride?: boolean } = {}) => ({
      brandId,
      name,
      image,
      imageLight: imageLight.trim() || null,
      status: publicationLocked ? "DRAFT" : status,
      stock: Math.max(0, Math.floor(Number(stock) || 0)),
      ...overrides,
    }),
    [brandId, name, image, imageLight, publicationLocked, status, stock],
  );

  /**
   * Enregistre immédiatement après un upload d'image, sur une fiche existante :
   * une image envoyée puis perdue parce qu'on quitte l'écran sans « Enregistrer »
   * est la façon la plus sûre de faire refaire le travail deux fois.
   */
  const autoSave = useCallback(
    async (overrides: Partial<PerfumePayload>) => {
      if (isNew || readOnly || saving) return;
      try {
        const res = await fetch(`/api/admin/perfumes/${perfumeId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(overrides)),
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
    [isNew, readOnly, saving, perfumeId, buildBody, router],
  );

  const save = useCallback(
    async (allowCompleteOverride: boolean) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(
          isNew ? "/api/admin/perfumes" : `/api/admin/perfumes/${perfumeId}`,
          {
            method: isNew ? "POST" : "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildBody({ allowCompleteOverride })),
          },
        );
        const json = await readJsonSafe<{ error?: string }>(res);
        if (!res.ok) throw new Error(json?.error ?? "Enregistrement refusé.");
        router.push(CATALOGUE_HREF);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enregistrement impossible.");
        setSaving(false);
      }
    },
    [isNew, perfumeId, buildBody, router],
  );

  const canSubmit = !readOnly && brandId !== "" && name.trim() !== "" && image.trim() !== "";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saving) return;
    if (brandIsComplete) {
      setConfirmComplete(true);
      return;
    }
    void save(false);
  };

  async function handleDelete() {
    if (!perfumeId || readOnly) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/perfumes/${perfumeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await readJsonSafe<{ error?: string }>(res);
        throw new Error(json?.error ?? "Suppression refusée.");
      }
      router.push(CATALOGUE_HREF);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible.");
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <PageScaffold ariaLabel="Chargement du parfum">
        <SkeletonList count={4} />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold padding={4} ariaLabel={isNew ? "Nouveau parfum" : "Fiche parfum"} formScroll>
      <form id="perfume-form" onSubmit={onSubmit}>
        <Stack gap={4}>
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Heading level={1}>{isNew ? "Nouveau parfum" : name || "Sans nom"}</Heading>
              {isNew ? (
                <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
                  Marque, nom et image sont requis.
                </p>
              ) : null}
            </div>
            {!isNew ? (
              <Badge tone={status === "PUBLISHED" ? "success" : "neutral"} size="md" dot>
                {status === "PUBLISHED" ? "Visible" : "Masqué"}
              </Badge>
            ) : null}
          </header>

          <ErrorBanner message={error} />

          <FormSection title="Informations">
            <BrandPicker
              brands={brands}
              value={brandId}
              onSelect={(b) => {
                setBrandId(b.id);
                if (b.catalogMode === "COMPLETE" || b.status === "DRAFT") setStatus("DRAFT");
              }}
              onClear={() => setBrandId("")}
              onBrandCreated={(b) =>
                setBrands((prev) =>
                  [...prev, b].sort((a, z) => a.name.localeCompare(z.name, "fr")),
                )
              }
              onError={setError}
              readOnly={readOnly}
            />
            {brandIsComplete || brandIsHidden ? (
              <p className="text-[12px] text-[var(--admin-warning)]">
                {brandIsComplete
                  ? "Marque en gamme complète : ce parfum ne s'affichera pas à l'unité."
                  : "Marque masquée : ce parfum restera masqué."}
              </p>
            ) : null}

            <Input
              label="Nom du parfum"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              required
              enterKeyHint="next"
              placeholder="Ex : Baccarat Rouge 540"
            />

            <Input
              label="Stock"
              type="number"
              inputMode="numeric"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              disabled={readOnly}
              numeric
              hint="Décrémenté automatiquement à chaque vente. Laisse 0 si tu ne suis pas le stock."
            />
          </FormSection>

          <FormSection title="Visuels">
            <ImageField
              label="Image principale"
              hint="Affichée partout. WebP recommandé."
              value={image}
              onChange={setImage}
              onCommit={(url) => void autoSave({ image: url })}
              onError={setError}
              readOnly={readOnly}
              clearable={false}
            />
            <Divider />
            <ImageField
              label="Variante claire"
              hint="Optionnelle : utilisée sur fond clair."
              value={imageLight}
              onChange={setImageLight}
              onCommit={(url) => void autoSave({ imageLight: url })}
              onError={setError}
              readOnly={readOnly}
            />
          </FormSection>

          <FormSection
            title="Publication"
            description={
              publicationLocked
                ? image.trim() === ""
                  ? "Ajoute une image principale pour pouvoir publier."
                  : "Réglé par la marque : ce parfum reste masqué."
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
              ariaLabel="Visibilité du parfum"
              className={publicationLocked ? "pointer-events-none opacity-50" : undefined}
            />
          </FormSection>

          {pricingSlot}

          {!isNew && !readOnly ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="text"
                size="sm"
                leadingIcon={<Trash2 size={15} />}
                onClick={() => setConfirmDelete(true)}
                className="text-[var(--admin-danger)]"
              >
                Supprimer ce parfum
              </Button>
            </div>
          ) : null}
        </Stack>

        <StickyAction>
          <Button
            type="submit"
            form="perfume-form"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={saving}
            disabled={!canSubmit}
          >
            {isNew ? "Créer le parfum" : "Enregistrer"}
          </Button>
        </StickyAction>
      </form>

      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        tone="primary"
        title="Marque en gamme complète"
        description={`${selectedBrand?.name ?? "Cette marque"} est proposée en gamme complète : le parfum sera enregistré mais masqué à l'unité.`}
        confirmLabel="Enregistrer quand même"
        onConfirm={async () => {
          setConfirmComplete(false);
          await save(true);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer ce parfum ?"
        description={`« ${name || "Sans nom"} » sera retiré du catalogue.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
      />
    </PageScaffold>
  );
}
