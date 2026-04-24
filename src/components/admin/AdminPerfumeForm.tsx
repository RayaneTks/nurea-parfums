"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X, AlertCircle } from "lucide-react";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { uploadFile } from "@/lib/admin/image-utils";
import Image from "next/image";

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
  { value: "PUBLISHED", label: "Visible", variant: "success" as const },
  { value: "DRAFT", label: "Masqué", variant: "warning" as const },
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
            className={`relative aspect-[3/4] w-32 shrink-0 overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-elevated)] shadow-sm transition-all duration-300 group ${!readOnly ? "cursor-pointer active:scale-95 hover:border-[var(--admin-accent)]" : ""}`}
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
                  <Loader2 className="h-8 w-8 animate-spin text-[#FDFCFA]" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-6 w-6 text-[#FDFCFA]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#FDFCFA]">Remplacer</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <AdminInput
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={readOnly}
              required={required}
              placeholder="https://..."
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
              {uploading ? "Envoi..." : "Importer un fichier"}
            </AdminButton>
          </div>
        </div>
      </div>

      {preview && allowClear && !readOnly && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex items-center gap-2 text-[11px] font-bold text-red-500/70 hover:text-red-500 transition-colors uppercase tracking-widest"
        >
          <X className="h-3.5 w-3.5" />
          Supprimer l&apos;image
        </button>
      )}
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

  const displayValue = open ? query : (selectedBrand?.name ?? "");

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
      <div className="relative group">
        <AdminInput
          value={displayValue}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(""); }}
          disabled={readOnly}
          placeholder="Rechercher ou créer une marque..."
          className={`pr-12 transition-all duration-300 ${brandId ? "border-[var(--admin-accent)]/50 bg-[rgba(139,58,58,0.06)] focus-visible:bg-[var(--admin-surface)]" : ""}`}
        />
        {brandId && selectedBrand && !open && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
             <AdminBadge
              label={selectedBrand.catalogMode === "COMPLETE" ? "Gamme complète" : "Sélection"}
              variant={selectedBrand.catalogMode === "COMPLETE" ? "warning" : "info"}
            />
          </div>
        )}
        {(query.trim().length > 0 || brandId) && !readOnly && (
          <button
            type="button"
            onClick={() => { setQuery(""); onClear(); setOpen(false); }}
            className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[var(--admin-muted)] transition-colors hover:bg-[#EDE8E3] hover:text-[var(--admin-text)] ${brandId && !open ? "opacity-0" : "opacity-100"}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-lg">
          <div className="p-1.5">
            {filtered.length > 0 ? (
              filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onSelect(b); setQuery(""); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-[14px] font-medium transition-colors active:scale-[0.98] ${
                    b.id === brandId
                      ? "bg-[rgba(139,58,58,0.12)] text-[var(--admin-text)]"
                      : "text-[var(--admin-text)] hover:bg-[#EDE8E3]"
                  }`}
                >
                  <span className="flex-1 truncate">{b.name}</span>
                  {b.id === brandId && <span className="h-1.5 w-1.5 shrink-0 bg-[var(--admin-accent-solid)]" aria-hidden />}
                </button>
              ))
            ) : query.trim().length < 2 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[var(--admin-muted)] text-sm font-medium">Commencez à taper pour filtrer...</p>
              </div>
            ) : null}

            {query.trim().length >= 2 && !exactMatch && (
              <button
                type="button"
                onClick={createBrand}
                disabled={creating}
                className="mt-1 flex w-full items-center gap-3 border border-[var(--admin-border)] bg-[rgba(139,58,58,0.06)] px-3 py-4 text-left text-[14px] font-semibold text-[var(--admin-accent-solid)] transition-colors hover:bg-[rgba(139,58,58,0.1)] active:scale-[0.98]"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 shrink-0" />}
                <span className="flex-1">Ajouter la marque « {query.trim()} »</span>
              </button>
            )}
          </div>
        </div>
      )}
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

  useEffect(() => { loadBrands(); }, [loadBrands]);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then(r => r.json())
      .then(j => { if (j.user?.role === "VIEWER") setReadOnly(true); });
  }, []);

  useEffect(() => {
    if (isNew || !perfumeId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/perfumes/${perfumeId}`, { credentials: "include", cache: "no-store" });
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
    if (error && errorRef.current) errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });    
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
        if (!window.confirm("Cette marque est en gamme complète. Le parfum sera masqué automatiquement. Continuer ?")) {
          setSaving(false); return;
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

  const handleAutoSave = useCallback(async (overrides: Partial<PerfumePayload>) => {
    if (isNew || readOnly || saving) return;

    const body = {
      brandId,
      name,
      image,
      imageLight: imageLight.trim() || null,
      status: isLockedByBrandMode || isLockedByBrandVisibility ? "DRAFT" : status,
      ...overrides
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
  }, [isNew, readOnly, saving, perfumeId, brandId, name, image, imageLight, isLockedByBrandMode, isLockedByBrandVisibility, status, router]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent-solid)]" />
      <p className="text-[var(--admin-muted)] text-sm font-medium">Chargement du parfum...</p>
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
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-muted)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#EDE8E3] hover:text-[var(--admin-text)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)]"
              title="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[var(--admin-text)] line-clamp-1">
                {isNew ? "Nouveau parfum" : name || "Sans nom"}
              </h1>
              {!isNew && (
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-muted)]">ID #{perfumeId}</p>
              )}
            </div>
          </div>
          {!isNew && (
            <AdminBadge label={status === "PUBLISHED" ? "Visible" : "Masqué"} variant={status === "PUBLISHED" ? "success" : "warning"} />
          )}
        </div>
      </div>

      <form id="perfume-form" onSubmit={onSubmit} className="space-y-10">
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
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Informations générales</h2>
          </div>

          <div className="space-y-6 bg-[var(--admin-elevated)]/90 border border-[var(--admin-border)] p-6 ">
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-[var(--admin-text)]">Marque</label>
              <BrandCombobox
                brands={brands}
                brandId={brandId}
                onSelect={(b) => { setBrandId(b.id); if (b.catalogMode === "COMPLETE" || b.status === "DRAFT") setStatus("DRAFT"); }}
                onClear={() => setBrandId("")}
                readOnly={readOnly}
                onBrandCreated={(b) => setBrands(prev => [...prev, b].sort((a,z) => a.name.localeCompare(z.name)))}
                onError={setError}
              />
              {(isLockedByBrandMode || isLockedByBrandVisibility) && (
                <p className="text-[12px] text-amber-500 font-medium">
                  Marque {isLockedByBrandMode ? "en gamme complète" : "masquée"}. Le parfum sera masqué.     
                </p>
              )}
            </div>

            <AdminInput
              label="Nom du parfum"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={readOnly}
              required
              placeholder="Ex: Baccarat Rouge 540"
              onClear={!readOnly && name.length > 0 ? () => setName("") : undefined}
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-[3px] shrink-0 bg-[var(--admin-accent-solid)]" aria-hidden />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Visuels du produit</h2>
          </div>

          <div className="grid gap-8 bg-[var(--admin-elevated)]/90 border border-[var(--admin-border)] p-6 ">
            <ImageUploadField
              label="Image principale (Dark Mode par défaut)"
              subtitle="Obligatoire. Utilisée pour les deux modes si l'image Light est absente. Ne peut pas être supprimée, seulement remplacée."
              value={image}
              onChange={setImage}
              onUploadDone={(url) => handleAutoSave({ image: url })}
              required
              readOnly={readOnly}
              onError={setError}
              allowClear={false} // Suppression interdite pour l'image principale
            />
            <div className="h-px bg-[#EDE8E3]" />
            <ImageUploadField
              label="Image variante (Light Mode)"
              subtitle="Optionnelle. Si présente, l'image principale ci-dessus devient exclusivement le visuel Dark."
              value={imageLight}
              onChange={setImageLight}
              onUploadDone={(url) => handleAutoSave({ imageLight: url })}
              readOnly={readOnly}
              onError={setError}
              allowClear={true} // Suppression autorisée pour l'image secondaire
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-[3px] shrink-0 bg-[var(--admin-accent-solid)]" aria-hidden />
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Statut de publication</h2>
          </div>

          <div className="bg-[var(--admin-elevated)]/90 border border-[var(--admin-border)] p-6 ">
            <div className="flex gap-3">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                const isImageMissing = !image || image.trim() === "";
                const locked = (isLockedByBrandMode || isLockedByBrandVisibility || isImageMissing) && opt.value === "PUBLISHED"; 
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={readOnly || locked}
                    onClick={() => setStatus(opt.value)}
                    className={`
                      relative flex-1 flex flex-col items-center gap-2 p-4  border transition-all duration-300 active:scale-[0.97] select-none touch-manipulation
                      ${active
                        ? "border-[var(--admin-accent)] bg-[#F4EFEA] shadow-sm"
                        : "bg-[var(--admin-elevated)] border-[var(--admin-border)] text-[var(--admin-muted)] [@media(hover:hover)]:hover:border-[var(--admin-border)]"}
                      ${locked ? "opacity-30 grayscale cursor-not-allowed" : ""}
                    `}
                  >
                    <AdminBadge label={opt.label} variant={active ? opt.variant : "neutral"} dot={active} />    
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${active ? "text-[var(--admin-text)]" : "text-[var(--admin-muted)]"}`}>
                      {opt.value === "PUBLISHED" ? "Public" : "Interne"}
                    </span>
                    {locked && isImageMissing && opt.value === "PUBLISHED" && (
                      <span className="absolute -bottom-6 left-0 right-0 text-[9px] text-amber-500 font-bold uppercase text-center">Image requise</span>
                    )}
                  </button>
                );
              })}
            </div>
            {readOnly && (
              <p className="mt-4 text-center text-xs text-amber-500 font-medium">
                Accès limité : modification du statut impossible.
              </p>
            )}
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
                Supprimer ce parfum
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 bg-red-500/5 border border-red-500/10  w-full animate-in zoom-in-95">
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider text-center">Suppression irréversible ?</p>
                <div className="flex gap-2 w-full max-w-xs">
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
              form="perfume-form"
              variant="primary"
              size="lg"
              className="h-14 w-full text-base"
              isLoading={saving}
              disabled={readOnly || !brandId || !name || !image}
            >
              {isNew ? "Créer le parfum" : "Enregistrer les modifications"}
            </AdminButton>
          </div>
        </div>
      </form>
    </div>
  );
}
