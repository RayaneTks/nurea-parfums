"use client";

import Image from "next/image";
import Link from "next/link";
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
  required,
  readOnly,
  onError,
  allowClear = true,
}: {
  label: string;
  subtitle?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  readOnly: boolean;
  onError: (msg: string) => void;
  allowClear?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const preview = value?.trim();
  const isRemote = preview && /^https?:\/\//i.test(preview);

  async function handleUpload(file: File | null) {
    if (!file || readOnly) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-[14px] font-bold text-zinc-200">{label}</span>
        {subtitle && (
          <p className="mt-1 text-[12px] text-zinc-500">{subtitle}</p>
        )}
      </div>

      <div className="grid gap-4">
        <AdminInput
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          required={required}
          placeholder="/branding/... ou https://..."
          onClear={!readOnly && value?.trim() ? () => onChange("") : undefined}
        />
        
        <label className="group relative">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="sr-only"
            disabled={uploading || readOnly}
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          />
          <AdminButton
            type="button"
            variant="outline"
            className="w-full pointer-events-none"
            isLoading={uploading}
            leftIcon={Upload}
          >
            {uploading ? "Envoi..." : "Importer un fichier"}
          </AdminButton>
        </label>
      </div>

      {preview && (
        <div className="relative aspect-square w-32 overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl group">
          <Image src={preview} alt="Aperçu" fill className="object-contain p-2" sizes="128px" />
          {allowClear && !readOnly && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-zinc-500 text-sm font-medium">Chargement de la marque...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <Link href="/admin/catalogue" className="group w-fit">
          <AdminButton variant="ghost" size="sm" leftIcon={ArrowLeft} className="text-zinc-500 group-hover:text-zinc-300">
            Retour au catalogue
          </AdminButton>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isNew ? "Nouvelle marque" : "Modifier la marque"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Gérez l&apos;identité et le mode d&apos;affichage de la marque.
            </p>
          </div>
          {!isNew && <AdminBadge label={`ID: ${brandId.slice(0,8)}`} />}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-10">
        {error && (
          <div ref={errorRef} className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in shake duration-500">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-blue-600 rounded-full" />
            <h2 className="text-lg font-bold text-zinc-100">Configuration</h2>
          </div>
          
          <div className="space-y-6 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
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
              <label className="text-[14px] font-bold text-zinc-200">Mode catalogue</label>
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
                        flex flex-col text-left p-4 rounded-2xl border transition-all duration-300 active:scale-[0.97]
                        ${active 
                          ? "bg-zinc-100 border-zinc-100 shadow-xl" 
                          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"}
                      `}
                    >
                      <span className={`text-sm font-bold ${active ? "text-zinc-900" : "text-zinc-100"}`}>{opt.label}</span>
                      <span className={`text-[11px] mt-1 ${active ? "text-zinc-500" : "text-zinc-500"}`}>{opt.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-blue-600 rounded-full" />
            <h2 className="text-lg font-bold text-zinc-100">Visuels de marque</h2>
          </div>

          <div className="grid gap-8 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
            <ImageUploadField
              label="Logo principal (Dark)"
              subtitle="Obligatoire pour une gamme complète. Format WebP/SVG."
              value={image}
              onChange={setImage}
              readOnly={readOnly}
              onError={setError}
              allowClear={true}
            />
            <div className="h-px bg-zinc-800/50" />
            <ImageUploadField
              label="Variante mode clair (Light)"
              subtitle="Optionnelle. Utilisée pour le thème clair."
              value={imageLight}
              onChange={setImageLight}
              readOnly={readOnly}
              onError={setError}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-blue-600 rounded-full" />
            <h2 className="text-lg font-bold text-zinc-100">Visibilité</h2>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
            <div className="flex gap-3">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setStatus(opt.value)}
                    className={`
                      relative flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 active:scale-[0.97]
                      ${active 
                        ? "bg-zinc-100 border-zinc-100 shadow-xl" 
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-500"}
                    `}
                  >
                    <AdminBadge label={opt.label} variant={active ? opt.variant : "neutral"} dot={active} />
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${active ? "text-zinc-900" : "text-zinc-600"}`}>
                      {opt.value === "PUBLISHED" ? "Public" : "Interne"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="sticky bottom-6 z-50 pt-4 mt-8">
          <div className="p-2 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl">
            <AdminButton
              type="submit"
              className="w-full"
              size="lg"
              isLoading={saving}
              disabled={readOnly || !name || (catalogMode === "COMPLETE" && !image)}
            >
              {isNew ? "Créer la marque" : "Enregistrer les modifications"}
            </AdminButton>
          </div>
          
          {!isNew && !readOnly && (
            <div className="pt-6 flex flex-col items-center">
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-[13px] font-bold text-red-500/70 hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  Supprimer cette marque
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl w-full animate-in zoom-in-95">
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Supprimer la marque et ses parfums ?</p>
                  <div className="flex gap-2 w-full">
                    <AdminButton variant="ghost" className="flex-1" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
                      Annuler
                    </AdminButton>
                    <AdminButton variant="danger" className="flex-1" onClick={handleDelete} isLoading={deleting}>
                      Confirmer
                    </AdminButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
