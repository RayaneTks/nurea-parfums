"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X, AlertCircle } from "lucide-react";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { uploadFile } from "@/lib/admin/image-utils";

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
  { value: "PUBLISHED", label: "Visible", variant: "success" as const },
  { value: "DRAFT", label: "Masquée", variant: "warning" as const },
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
      if (onUploadDone) {
        onUploadDone(url);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  const triggerUpload = () => {
    if (!readOnly && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleDeleteImage = () => {
    onChange("");
    if (onUploadDone) onUploadDone("");
  };

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-[14px] font-bold text-[var(--admin-text)]">{label}</span>
        {subtitle && (
          <p className="mt-1 text-[12px] text-[var(--admin-muted)]">{subtitle}</p>
        )}
      </div>

      <div className="grid gap-4">
        <div className="flex gap-4 items-start">
          <div
            className={`relative aspect-square w-32 shrink-0 overflow-hidden  bg-[var(--admin-elevated)] border border-[var(--admin-border)] shadow-xl group transition-all duration-300 ${!readOnly ? "cursor-pointer active:scale-95 hover:border-[var(--admin-accent)]" : ""}`}
            onClick={triggerUpload}
          >
            {preview ? (
              <Image src={preview} alt="Aperçu" fill className="object-contain p-2" sizes="128px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--admin-muted)]">
                <Upload className="h-8 w-8" />
              </div>
            )}

            {!readOnly && (
              <div className={`absolute inset-0 flex items-center justify-center bg-[rgba(26,18,21,0.45)] backdrop-blur-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${uploading ? "opacity-100" : ""}`}>
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#EDE9E6]" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-6 w-6 text-[#EDE9E6]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#EDE9E6]">Remplacer</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <AdminInput
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              disabled={readOnly}
              required={required}
              placeholder="https://..."
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
                {uploading ? "Envoi..." : "Importer"}
              </AdminButton>
              {preview && allowClear && !readOnly && (
                <AdminButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDeleteImage}
                  className="px-3 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </AdminButton>
              )}
            </div>
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
      .then(r => r.json())
      .then(j => { if (j.user?.role === "VIEWER") setReadOnly(true); });
  }, []);

  useEffect(() => {
    if (isNew || !brandId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/brands/${brandId}`, { credentials: "include", cache: "no-store" });   
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
    if (error && errorRef.current) errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });    
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
      setError("Une image est obligatoire pour le mode gamme complète.");
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

  const handleAutoSave = useCallback(async (overrides: Partial<BrandPayload>) => {
    if (isNew || readOnly || saving) return;

    const payload = {
      name,
      catalogMode,
      status,
      image,
      imageLight,
      ...overrides
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
  }, [isNew, readOnly, saving, brandId, name, catalogMode, status, image, imageLight, router]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent-solid)]" />
      <p className="text-[var(--admin-muted)] text-sm font-medium">Chargement de la marque...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">  
      {/* Header Sticky avec bouton Retour */}
      <div className="sticky top-0 z-[60] -mx-4 px-4 py-4 bg-[var(--admin-surface)]/95 backdrop-blur-xl border-b border-[var(--admin-border)] mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-muted)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[rgba(237,233,230,0.08)] hover:text-[var(--admin-text)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)]"
              title="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--admin-text)] line-clamp-1">
                {isNew ? "Nouvelle marque" : name || "Sans nom"}
              </h1>
              {!isNew && (
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-muted)]">ID #{brandId.slice(0,8)}</p>
              )}
            </div>
          </div>
          {!isNew && (
            <AdminBadge label={status === "PUBLISHED" ? "Visible" : "Masquée"} variant={status === "PUBLISHED" ? "success" : "warning"} />
          )}
        </div>
      </div>

      <form id="brand-form" onSubmit={onSubmit} className="space-y-10">
        {error && (
          <div
            ref={errorRef}
            className="flex animate-in items-center gap-3 border border-[rgba(163,48,48,0.3)] bg-[rgba(163,48,48,0.06)] p-4 duration-500"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-[var(--admin-danger)]" />
            <p className="text-sm font-medium text-[var(--admin-danger)]">{error}</p>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-[3px] shrink-0 bg-[var(--admin-accent-solid)]" aria-hidden />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Configuration</h2>
          </div>

          <div className="space-y-6 bg-[var(--admin-elevated)]/90 border border-[var(--admin-border)] p-6 ">
            <AdminInput
              label="Nom de la marque"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={readOnly}
              required
              placeholder="Ex: Yves Saint Laurent"
              onClear={!readOnly && name.length > 0 ? () => setName("") : undefined}
            />

            <div className="space-y-3">
              <label className="text-[14px] font-bold text-[var(--admin-text)]">Mode catalogue</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODE_OPTIONS.map((opt) => {
                  const active = catalogMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setCatalogMode(opt.value)}
                      className={`
                        flex flex-col text-left p-4  border transition-all duration-300 active:scale-[0.97]
                        ${active
                          ? "border-[var(--admin-accent)] bg-[var(--admin-accent-muted)]"
                          : "bg-[var(--admin-elevated)] border-[var(--admin-border)] hover:border-[var(--admin-border)]"}
                      `}
                    >
                      <span className="text-sm font-semibold text-[var(--admin-text)]">{opt.label}</span>
                      <span className="mt-1 text-[11px] text-[var(--admin-muted)]">{opt.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-[3px] shrink-0 bg-[var(--admin-accent-solid)]" aria-hidden />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Visuels de marque</h2>
          </div>

          <div className="grid gap-8 bg-[var(--admin-elevated)]/90 border border-[var(--admin-border)] p-6 ">
            <ImageUploadField
              label={imageLight ? "Image mode sombre (Dark)" : "Image principale (Mode sombre + clair)"}        
              subtitle="Optimisation automatique (WebP, 1024x1536) recommandée."
              value={image}
              onChange={setImage}
              onUploadDone={(url) => handleAutoSave({ image: url })}
              readOnly={readOnly}
              onError={setError}
              allowClear={true}
            />
            <div className="h-px bg-[var(--admin-border)]" />
            <ImageUploadField
              label="Image mode clair (Light)"
              subtitle="Optionnel. Si ajoutée, l'image ci-dessus devient l'image 'Sombre' uniquement."
              value={imageLight}
              onChange={setImageLight}
              onUploadDone={(url) => handleAutoSave({ imageLight: url })}
              readOnly={readOnly}
              onError={setError}
              allowClear={true}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-[3px] shrink-0 bg-[var(--admin-accent-solid)]" aria-hidden />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Visibilité</h2>
          </div>

          <div className="bg-[var(--admin-elevated)]/90 border border-[var(--admin-border)] p-6 ">
            <div className="flex gap-3">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                const isImageMissing = !image || image.trim() === "";
                const locked = isImageMissing && opt.value === "PUBLISHED";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={readOnly || locked}
                    onClick={() => setStatus(opt.value)}
                    className={`
                      relative flex-1 flex flex-col items-center gap-2 p-4  border transition-all duration-300 active:scale-[0.97]
                      ${active
                        ? "border-[var(--admin-accent)] bg-[var(--admin-accent-muted)]"
                        : "bg-[var(--admin-elevated)] border-[var(--admin-border)] text-[var(--admin-muted)]"}
                      ${locked ? "opacity-30 grayscale cursor-not-allowed" : ""}
                    `}
                  >
                    <AdminBadge label={opt.label} variant={active ? opt.variant : "neutral"} dot={active} />    
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${active ? "text-[var(--admin-text)]" : "text-[var(--admin-muted)]"}`}>
                      {opt.value === "PUBLISHED" ? "Public" : "Interne"}
                    </span>
                    {locked && opt.value === "PUBLISHED" && (
                      <span className="absolute -bottom-6 left-0 right-0 text-[9px] text-amber-500 font-bold uppercase text-center">Image requise</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bouton de suppression fixé en bas du flux, pas sticky */}
        {!isNew && !readOnly && (
          <div className="pt-12 flex flex-col items-center border-t border-[var(--admin-border)]">
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="group flex items-center gap-2 text-[13px] font-bold text-[var(--admin-muted)] hover:text-red-500 transition-all uppercase tracking-widest"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer cette marque
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 bg-red-500/5 border border-red-500/10  w-full animate-in zoom-in-95">
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider text-center">Suppression irréversible ?</p>
                <p className="text-[10px] text-[var(--admin-muted)] text-center -mt-1">Tous les parfums associés seront supprimés.</p>
                <div className="flex gap-2 w-full max-w-xs mt-2">
                  <AdminButton variant="ghost" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
                    Annuler
                  </AdminButton>
                  <AdminButton variant="danger" className="flex-1" onClick={handleDelete} isLoading={deleting} leftIcon={Trash2}>
                    Confirmer
                  </AdminButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barre d'action sticky pour la sauvegarde */}
        <div
          className="fixed left-1/2 z-[65] w-full max-w-md -translate-x-1/2 px-4"
          style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="border border-[var(--admin-border)] bg-[var(--admin-surface)]/98 p-2 shadow-md backdrop-blur-md">
            <AdminButton
              type="submit"
              form="brand-form"
              variant="primary"
              size="lg"
              className="h-14 w-full text-base"
              isLoading={saving}
              disabled={readOnly || !name || (catalogMode === "COMPLETE" && !image)}
            >
              {isNew ? "Créer la marque" : "Enregistrer les modifications"}
            </AdminButton>
          </div>
        </div>
      </form>
    </div>
  );
}
