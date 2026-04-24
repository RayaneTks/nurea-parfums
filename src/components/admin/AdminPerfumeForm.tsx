"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X, AlertCircle } from "lucide-react";
import Image from "next/image";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { SectionCard } from "./ui/SectionCard";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { PageHeader } from "./shell/PageHeader";
import { HeaderAction } from "./shell/HeaderAction";
import { uploadFile } from "@/lib/admin/image-utils";
import { cn } from "@/lib/utils";

type BrandOpt = {
  id: string;
  name: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
};

type PerfumePayload = {
  id: number;
  brandId: string;
  name: string;
  image: string;
  imageLight: string | null;
  status: string;
  brand: { name: string };
};

const STATUS_OPTIONS = [
  { value: "PUBLISHED", label: "Visible" },
  { value: "DRAFT", label: "Masqué" },
] as const;

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function ImageUploadField({
  label,
  subtitle,
  value,
  onChange,
  onUploadDone,
  required,
  readOnly,
  onError,
  allowClear = true,
}: {
  label: string;
  subtitle?: string;
  value: string;
  onChange: (url: string) => void;
  onUploadDone?: (url: string) => void;
  required?: boolean;
  readOnly: boolean;
  onError: (msg: string) => void;
  allowClear?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preview = value.trim();

  async function handleUpload(file: File | null) {
    if (!file || readOnly) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
      onUploadDone?.(url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  const triggerUpload = () => {
    if (!readOnly && !uploading) fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wider text-admin-text">
          {label}
        </p>
        {subtitle ? (
          <p className="mt-1 text-[11px] text-admin-subtle">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex gap-3 items-start">
        <button
          type="button"
          onClick={triggerUpload}
          disabled={readOnly}
          className={cn(
            "relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl",
            "bg-admin-bg border border-admin-border",
            !readOnly && "cursor-pointer tap-scale [@media(hover:hover)]:hover:border-admin-border-hover",
            "group transition-colors duration-200",
          )}
        >
          {preview ? (
            <Image src={preview} alt="Aperçu" fill className="object-contain p-2" sizes="112px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-admin-subtle">
              <Upload className="h-6 w-6" aria-hidden />
            </div>
          )}
          {!readOnly ? (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-[var(--admin-overlay)] opacity-0 transition-opacity duration-200",
                "[@media(hover:hover)]:group-hover:opacity-100",
                uploading && "opacity-100",
              )}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-admin-text" aria-hidden />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-admin-text" aria-hidden />
                  <span className="text-[9px] uppercase tracking-wider text-admin-text">
                    Remplacer
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </button>

        <div className="flex-1 space-y-2">
          <AdminInput
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            required={required}
            placeholder="https://…"
            onClear={!readOnly && value.trim().length > 0 ? () => onChange("") : undefined}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="sr-only"
            disabled={uploading || readOnly}
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          />

          <AdminButton
            type="button"
            variant="outline"
            className="w-full"
            size="sm"
            isLoading={uploading}
            leftIcon={Upload}
            onClick={triggerUpload}
            disabled={readOnly}
          >
            {uploading ? "Envoi…" : "Importer un fichier"}
          </AdminButton>
        </div>
      </div>

      {preview && allowClear && !readOnly ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-admin-danger [@media(hover:hover)]:hover:opacity-80 transition-opacity"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Supprimer l&apos;image
        </button>
      ) : null}
    </div>
  );
}

function BrandCombobox({
  brands,
  brandId,
  onSelect,
  onClear,
  readOnly,
  onBrandCreated,
  onError,
}: {
  brands: BrandOpt[];
  brandId: string;
  onSelect: (b: BrandOpt) => void;
  onClear: () => void;
  readOnly: boolean;
  onBrandCreated: (b: BrandOpt) => void;
  onError: (msg: string) => void;
}) {
  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayValue = open ? query : selectedBrand?.name ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands.slice(0, 8);
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brands.some((b) => b.name.toLowerCase() === q);
  }, [brands, query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function createBrand() {
    const name = query.trim();
    if (name.length < 2) return;
    setCreating(true);
    try {
      const r = await fetch("/api/admin/brands", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = await readJsonSafe<{ error?: string; brand?: BrandOpt }>(r);
      if (!r.ok) throw new Error(j?.error ?? "Création échouée");
      if (j?.brand) {
        onBrandCreated(j.brand);
        onSelect(j.brand);
        setQuery("");
        setOpen(false);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <AdminInput
        label="Marque"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        disabled={readOnly}
        placeholder="Rechercher ou créer une marque…"
        onClear={
          (query.trim().length > 0 || brandId) && !readOnly
            ? () => {
                setQuery("");
                onClear();
                setOpen(false);
              }
            : undefined
        }
      />

      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-admin-border bg-admin-surface shadow-[0_20px_40px_rgba(0,0,0,0.5)] custom-scrollbar">
          <div className="p-1.5">
            {filtered.length > 0
              ? filtered.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelect(b);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-3 text-left text-[14px] rounded-xl",
                      "transition-colors duration-200 tap-scale",
                      b.id === brandId
                        ? "bg-admin-accent text-admin-bg"
                        : "text-admin-text [@media(hover:hover)]:hover:bg-admin-surface-hover",
                    )}
                  >
                    <span className="flex-1 truncate">{b.name}</span>
                    {b.id === brandId ? (
                      <span className="h-1 w-1 rounded-full bg-admin-bg" aria-hidden />
                    ) : null}
                  </button>
                ))
              : query.trim().length < 2 ? (
                  <div className="px-4 py-6 text-center text-[13px] text-admin-subtle">
                    Commence à taper pour filtrer…
                  </div>
                ) : null}

            {query.trim().length >= 2 && !exactMatch ? (
              <button
                type="button"
                onClick={createBrand}
                disabled={creating}
                className="mt-1 flex w-full items-center gap-3 px-3 py-3 text-left text-[13px] font-medium text-admin-accent bg-admin-accent-subtle rounded-xl border border-admin-border-hover [@media(hover:hover)]:hover:bg-admin-accent [@media(hover:hover)]:hover:text-admin-bg transition-colors tap-scale"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="flex-1">Ajouter la marque « {query.trim()} »</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminPerfumeForm({ perfumeId }: { perfumeId?: string }) {
  const router = useRouter();
  const isNew = !perfumeId;
  const errorRef = useRef<HTMLDivElement | null>(null);

  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [imageLight, setImageLight] = useState("");
  const [status, setStatus] = useState("PUBLISHED");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBrands = useCallback(async () => {
    const r = await fetch("/api/admin/brands", { credentials: "include", cache: "no-store" });
    if (r.ok) {
      const j = await readJsonSafe<{ brands: BrandOpt[] }>(r);
      setBrands(j?.brands ?? []);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.user?.role === "VIEWER") setReadOnly(true);
      });
  }, []);

  useEffect(() => {
    if (isNew || !perfumeId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/perfumes/${perfumeId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const j = await readJsonSafe<{ error?: string; perfume?: PerfumePayload }>(r);
        if (!r.ok) throw new Error(j?.error ?? "Chargement impossible");
        if (j?.perfume) {
          const p = j.perfume;
          setBrandId(p.brandId);
          setName(p.name);
          setImage(p.image);
          setImageLight(p.imageLight ?? "");
          setStatus(p.status);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [isNew, perfumeId]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);
  const isLockedByBrandMode = selectedBrand?.catalogMode === "COMPLETE";
  const isLockedByBrandVisibility = selectedBrand?.status === "DRAFT";

  async function handleDelete() {
    if (!perfumeId || readOnly) return;
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/perfumes/${perfumeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Suppression refusée");
      }
      router.push("/admin/catalogue?tab=perfumes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !brandId || !name || !image) return;

    setSaving(true);
    setError(null);
    try {
      let allowCompleteOverride = false;
      if (selectedBrand?.catalogMode === "COMPLETE") {
        if (
          !window.confirm(
            "Cette marque est en gamme complète. Le parfum sera masqué automatiquement. Continuer ?",
          )
        ) {
          setSaving(false);
          return;
        }
        allowCompleteOverride = true;
      }

      const body = {
        brandId,
        name,
        image,
        imageLight: imageLight.trim() || null,
        status: isLockedByBrandMode || isLockedByBrandVisibility ? "DRAFT" : status,
        allowCompleteOverride,
      };

      const url = isNew ? "/api/admin/perfumes" : `/api/admin/perfumes/${perfumeId}`;
      const r = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readJsonSafe<{ error?: string; warning?: string }>(r);
      if (!r.ok) throw new Error(j?.error ?? "Erreur d'enregistrement");
      router.push("/admin/catalogue?tab=perfumes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const handleAutoSave = useCallback(
    async (overrides: Partial<PerfumePayload>) => {
      if (isNew || readOnly || saving) return;

      const body = {
        brandId,
        name,
        image,
        imageLight: imageLight.trim() || null,
        status: isLockedByBrandMode || isLockedByBrandVisibility ? "DRAFT" : status,
        ...overrides,
      };

      try {
        const r = await fetch(`/api/admin/perfumes/${perfumeId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const j = await readJsonSafe<{ error?: string }>(r);
          throw new Error(j?.error ?? "Auto-save échoué");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde automatique");
      }
    },
    [
      isNew,
      readOnly,
      saving,
      perfumeId,
      brandId,
      name,
      image,
      imageLight,
      isLockedByBrandMode,
      isLockedByBrandVisibility,
      status,
      router,
    ],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-admin-accent" aria-hidden />
        <p className="text-[12px] uppercase tracking-wider text-admin-subtle">
          Chargement…
        </p>
      </div>
    );
  }

  const isImageMissing = !image || image.trim() === "";

  return (
    <>
      <PageHeader
        title={isNew ? "Nouveau parfum" : name || "Sans nom"}
        eyebrow={isNew ? "Création" : `Parfum #${perfumeId}`}
        leading={
          <HeaderAction
            label="Retour"
            icon={ArrowLeft}
            onClick={() => router.back()}
          />
        }
        action={
          !isNew ? (
            <AdminBadge
              label={status === "PUBLISHED" ? "Visible" : "Masqué"}
              variant={status === "PUBLISHED" ? "success" : "warning"}
            />
          ) : null
        }
      />

      <main id="main-content" className="flex-1 px-5 pt-6 pb-32">
        <form id="perfume-form" onSubmit={onSubmit} className="space-y-8">
          {error ? (
            <div
              ref={errorRef}
              className="flex items-start gap-3 p-4 border border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)] rounded-xl"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-admin-danger shrink-0 mt-0.5" aria-hidden />
              <p className="text-[13px] text-admin-danger">{error}</p>
            </div>
          ) : null}

          <section className="space-y-4">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle">
              Informations
            </h2>
            <SectionCard className="p-5 space-y-5">
              <div className="space-y-2">
                <BrandCombobox
                  brands={brands}
                  brandId={brandId}
                  onSelect={(b) => {
                    setBrandId(b.id);
                    if (b.catalogMode === "COMPLETE" || b.status === "DRAFT") setStatus("DRAFT");
                  }}
                  onClear={() => setBrandId("")}
                  readOnly={readOnly}
                  onBrandCreated={(b) =>
                    setBrands((prev) => [...prev, b].sort((a, z) => a.name.localeCompare(z.name)))
                  }
                  onError={setError}
                />
                {isLockedByBrandMode || isLockedByBrandVisibility ? (
                  <p className="text-[12px] text-[var(--admin-warning)]">
                    Marque {isLockedByBrandMode ? "en gamme complète" : "masquée"} · le parfum sera masqué.
                  </p>
                ) : null}
              </div>

              <AdminInput
                label="Nom du parfum"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                required
                placeholder="Ex : Baccarat Rouge 540"
                onClear={!readOnly && name.length > 0 ? () => setName("") : undefined}
              />
            </SectionCard>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle">
              Visuels
            </h2>
            <SectionCard className="p-5 space-y-6">
              <ImageUploadField
                label="Image principale (dark)"
                subtitle="Utilisée dans les deux thèmes si la variante claire est absente."
                value={image}
                onChange={setImage}
                onUploadDone={(url) => handleAutoSave({ image: url })}
                required
                readOnly={readOnly}
                onError={setError}
                allowClear={false}
              />
              <div className="h-px bg-admin-border" />
              <ImageUploadField
                label="Image variante (light)"
                subtitle="Optionnelle. Si présente, la principale devient exclusivement le visuel dark."
                value={imageLight}
                onChange={setImageLight}
                onUploadDone={(url) => handleAutoSave({ imageLight: url })}
                readOnly={readOnly}
                onError={setError}
                allowClear
              />
            </SectionCard>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle">
              Statut de publication
            </h2>
            <SectionCard className="p-5">
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.value;
                  const locked =
                    (isLockedByBrandMode || isLockedByBrandVisibility || isImageMissing) &&
                    opt.value === "PUBLISHED";
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={readOnly || locked}
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "flex-1 min-h-12 px-4 rounded-xl border",
                        "text-[12px] uppercase tracking-wider font-medium",
                        "transition-colors duration-200 tap-scale",
                        active
                          ? "bg-admin-accent text-admin-bg border-admin-accent"
                          : "bg-admin-surface border-admin-border text-admin-muted",
                        locked && "opacity-40 cursor-not-allowed",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {isImageMissing && status === "PUBLISHED" ? (
                <p className="mt-3 text-[11px] text-[var(--admin-warning)]">
                  Ajoute une image pour pouvoir publier.
                </p>
              ) : null}
            </SectionCard>
          </section>

          {!isNew && !readOnly ? (
            <div className="pt-6 flex justify-center border-t border-admin-border">
              <AdminButton
                variant="ghost"
                size="sm"
                leftIcon={Trash2}
                onClick={() => setDeleteConfirm(true)}
                className="text-admin-danger [@media(hover:hover)]:hover:bg-[var(--admin-danger-subtle)]"
              >
                Supprimer ce parfum
              </AdminButton>
            </div>
          ) : null}
        </form>
      </main>

      <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[55] w-full max-w-[430px] px-5">
        <AdminButton
          type="submit"
          form="perfume-form"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={saving}
          disabled={readOnly || !brandId || !name || !image}
        >
          {isNew ? "Créer le parfum" : "Enregistrer"}
        </AdminButton>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Supprimer ce parfum ?"
        description="Cette action retire le parfum du catalogue."
        confirmLabel="Supprimer définitivement"
        destructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
}
