"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Trash2, Upload, AlertCircle } from "lucide-react";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { SectionCard } from "./ui/SectionCard";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { PageHeader } from "./shell/PageHeader";
import { HeaderAction } from "./shell/HeaderAction";
import { uploadFile } from "@/lib/admin/image-utils";
import { cn } from "@/lib/utils";

type BrandPayload = {
  id: string;
  name: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
  imageLight: string | null;
};

const MODE_OPTIONS = [
  { value: "CURATED", label: "Sélection", subtitle: "Quelques parfums choisis." },
  { value: "COMPLETE", label: "Gamme complète", subtitle: "Tous les parfums de la marque." },
] as const;

const STATUS_OPTIONS = [
  { value: "PUBLISHED", label: "Visible" },
  { value: "DRAFT", label: "Masquée" },
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
  const preview = value?.trim();

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

  const handleDeleteImage = () => {
    onChange("");
    onUploadDone?.("");
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wider text-admin-text">
          {label}
        </p>
        {subtitle ? <p className="mt-1 text-[11px] text-admin-subtle">{subtitle}</p> : null}
      </div>

      <div className="flex gap-3 items-start">
        <button
          type="button"
          onClick={triggerUpload}
          disabled={readOnly}
          className={cn(
            "relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl",
            "bg-admin-bg border border-admin-border group transition-colors duration-200",
            !readOnly && "cursor-pointer tap-scale [@media(hover:hover)]:hover:border-admin-border-hover",
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
                <Upload className="h-5 w-5 text-admin-text" aria-hidden />
              )}
            </div>
          ) : null}
        </button>

        <div className="flex-1 space-y-2">
          <AdminInput
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            required={required}
            placeholder="https://…"
            onClear={!readOnly && value?.trim() ? handleDeleteImage : undefined}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="sr-only"
            disabled={uploading || readOnly}
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          />
          <div className="flex gap-2">
            <AdminButton
              type="button"
              variant="outline"
              className="flex-1"
              size="sm"
              isLoading={uploading}
              leftIcon={Upload}
              onClick={triggerUpload}
              disabled={readOnly}
            >
              {uploading ? "Envoi…" : "Importer"}
            </AdminButton>
            {preview && allowClear && !readOnly ? (
              <AdminButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeleteImage}
                aria-label="Supprimer l'image"
                className="text-admin-danger [@media(hover:hover)]:hover:bg-[var(--admin-danger-subtle)]"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </AdminButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminBrandForm({ brandId }: { brandId?: string }) {
  const router = useRouter();
  const isNew = !brandId;
  const errorRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const [name, setName] = useState("");
  const [catalogMode, setCatalogMode] = useState<"CURATED" | "COMPLETE">("CURATED");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");
  const [image, setImage] = useState("");
  const [imageLight, setImageLight] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.user?.role === "VIEWER") setReadOnly(true);
      });
  }, []);

  useEffect(() => {
    if (isNew || !brandId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/brands/${brandId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const j = await readJsonSafe<{ error?: string; brand?: BrandPayload }>(r);
        if (!r.ok) throw new Error(j?.error ?? "Chargement impossible");
        if (j?.brand) {
          setName(j.brand.name);
          setCatalogMode(j.brand.catalogMode);
          setStatus(j.brand.status);
          setImage(j.brand.image ?? "");
          setImageLight(j.brand.imageLight ?? "");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [isNew, brandId]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  async function handleDelete() {
    if (!brandId || readOnly) return;
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/brands/${brandId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Suppression refusée");
      }
      router.push("/admin/catalogue?tab=brands");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !name) return;
    if (catalogMode === "COMPLETE" && !image) {
      setError("Une image est obligatoire pour une gamme complète.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        catalogMode,
        status,
        image: image.trim() || null,
        imageLight: imageLight.trim() || null,
      };

      const endpoint = isNew ? "/api/admin/brands" : `/api/admin/brands/${brandId}`;
      const method = isNew ? "POST" : "PATCH";

      const r = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await readJsonSafe<{ error?: string }>(r);
      if (!r.ok) throw new Error(j?.error ?? "Enregistrement refusé");
      router.push("/admin/catalogue?tab=brands");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const handleAutoSave = useCallback(
    async (overrides: Partial<BrandPayload>) => {
      if (isNew || readOnly || saving) return;

      const payload = {
        name,
        catalogMode,
        status,
        image,
        imageLight,
        ...overrides,
      };

      try {
        const r = await fetch(`/api/admin/brands/${brandId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
    [isNew, readOnly, saving, brandId, name, catalogMode, status, image, imageLight, router],
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
        title={isNew ? "Nouvelle marque" : name || "Sans nom"}
        eyebrow={isNew ? "Création" : brandId ? `Marque · ${brandId.slice(0, 8)}` : undefined}
        leading={
          <HeaderAction label="Retour" icon={ArrowLeft} onClick={() => router.back()} />
        }
        action={
          !isNew ? (
            <AdminBadge
              label={status === "PUBLISHED" ? "Visible" : "Masquée"}
              variant={status === "PUBLISHED" ? "success" : "warning"}
            />
          ) : null
        }
      />

      <main id="main-content" className="flex-1 px-5 pt-6 pb-32">
        <form id="brand-form" onSubmit={onSubmit} className="space-y-8">
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
              Configuration
            </h2>
            <SectionCard className="p-5 space-y-5">
              <AdminInput
                label="Nom de la marque"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                required
                placeholder="Ex : Yves Saint Laurent"
                onClear={!readOnly && name.length > 0 ? () => setName("") : undefined}
              />

              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-admin-muted">
                  Mode catalogue
                </p>
                <div className="grid gap-2">
                  {MODE_OPTIONS.map((opt) => {
                    const active = catalogMode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() => setCatalogMode(opt.value)}
                        className={cn(
                          "flex flex-col items-start text-left p-4 rounded-xl border",
                          "transition-colors duration-200 tap-scale",
                          active
                            ? "bg-admin-accent-subtle border-admin-border-hover"
                            : "bg-admin-surface border-admin-border [@media(hover:hover)]:hover:border-admin-border-hover",
                        )}
                      >
                        <span className="font-serif text-[15px] tracking-[-0.01em] text-admin-text">
                          {opt.label}
                        </span>
                        <span className="mt-1 text-[11px] text-admin-subtle">{opt.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-admin-subtle">
              Visuels
            </h2>
            <SectionCard className="p-5 space-y-6">
              <ImageUploadField
                label={imageLight ? "Image dark" : "Image principale (dark + clair)"}
                subtitle="WebP recommandé, 1024×1536."
                value={image}
                onChange={setImage}
                onUploadDone={(url) => handleAutoSave({ image: url })}
                readOnly={readOnly}
                onError={setError}
                allowClear
              />
              <div className="h-px bg-admin-border" />
              <ImageUploadField
                label="Image light (variante)"
                subtitle="Optionnelle. Si présente, la principale devient le visuel dark."
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
              Visibilité
            </h2>
            <SectionCard className="p-5">
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.value;
                  const locked = isImageMissing && opt.value === "PUBLISHED";
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
                Supprimer cette marque
              </AdminButton>
            </div>
          ) : null}
        </form>
      </main>

      <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[55] w-full max-w-[430px] px-5">
        <AdminButton
          type="submit"
          form="brand-form"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={saving}
          disabled={readOnly || !name || (catalogMode === "COMPLETE" && !image)}
        >
          {isNew ? "Créer la marque" : "Enregistrer"}
        </AdminButton>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Supprimer cette marque ?"
        description="Tous les parfums associés seront supprimés."
        confirmLabel="Supprimer définitivement"
        destructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
}
