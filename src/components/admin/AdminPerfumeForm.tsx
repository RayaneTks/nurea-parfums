"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X, AlertCircle } from "lucide-react";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";
import { AdminBadge } from "./ui/AdminBadge";
import { uploadFile } from "@/lib/admin/image-utils";

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
  const preview = value.trim();
  const isRemote = /^https?:\/\//i.test(preview);

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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          required={required}
          placeholder="/parfums/... ou https://..."
          onClear={!readOnly && value.trim().length > 0 ? () => onChange("") : undefined}
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
        <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl group">
          {isRemote ? (
            <Image src={preview} alt="Aperçu" fill className="object-contain p-2" sizes="128px" />
          ) : (
            <Image src={preview} alt="Aperçu" width={128} height={192} className="h-full w-full object-contain p-2" />
          )}
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q.length >= 2 && brands.some((b) => b.name.toLowerCase() === q);
  }, [brands, query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  if (brandId && selectedBrand) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-inner">
        <div className="flex-1">
          <p className="text-[15px] font-bold text-zinc-100">{selectedBrand.name}</p>
          <div className="mt-1">
            <AdminBadge 
              label={selectedBrand.catalogMode === "COMPLETE" ? "Gamme complète" : "Sélection"} 
              variant={selectedBrand.catalogMode === "COMPLETE" ? "warning" : "info"}
            />
          </div>
        </div>
        {!readOnly && (
          <AdminButton size="icon" variant="ghost" onClick={onClear} className="h-10 w-10 min-h-0 min-w-0">
            <X className="h-4 w-4" />
          </AdminButton>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <AdminInput
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        disabled={readOnly}
        placeholder="Rechercher ou créer une marque..."
        onClear={query.trim().length > 0 ? () => { setQuery(""); setOpen(false); } : undefined}
      />
      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-top-2">
          {filtered.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { onSelect(b); setQuery(""); setOpen(false); }}
              className="flex w-full items-center px-4 py-3 text-left text-[14px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              {b.name}
            </button>
          ))}
          {!exactMatch && query.trim().length >= 2 && (
            <button
              type="button"
              onClick={createBrand}
              disabled={creating}
              className="flex w-full items-center gap-2 border-t border-zinc-800 px-4 py-4 text-left text-[14px] font-bold text-blue-400 hover:bg-zinc-800 transition-colors"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer la marque « {query.trim()} »
            </button>
          )}
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
      router.push("/admin");
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
      router.push("/admin");
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
      <p className="text-zinc-500 text-sm font-medium">Chargement du parfum...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <Link href="/admin" className="group w-fit">
          <AdminButton variant="ghost" size="sm" leftIcon={ArrowLeft} className="text-zinc-500 group-hover:text-zinc-300">
            Retour au catalogue
          </AdminButton>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {isNew ? "Nouveau parfum" : "Modifier le parfum"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Remplissez les informations essentielles du parfum.
            </p>
          </div>
          {!isNew && (
            <AdminBadge label={`#${perfumeId}`} />
          )}
        </div>
      </div>

      <form id="perfume-form" onSubmit={onSubmit} className="space-y-10">
        {error && (
          <div ref={errorRef} className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in shake duration-500">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-blue-600 rounded-full" />
            <h2 className="text-lg font-bold text-zinc-100">Informations générales</h2>
          </div>
          
          <div className="space-y-6 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
            <div className="space-y-2">
              <label className="text-[14px] font-bold text-zinc-200">Marque</label>
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
            <div className="h-6 w-1 bg-blue-600 rounded-full" />
            <h2 className="text-lg font-bold text-zinc-100">Visuels du produit</h2>
          </div>

          <div className="grid gap-8 bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
            <ImageUploadField
              label="Image principale"
              subtitle="Utilisée pour tous les thèmes. Format WebP recommandé."
              value={image}
              onChange={setImage}
              required
              readOnly={readOnly}
              onError={setError}
              allowClear={false}
            />
            <div className="h-px bg-zinc-800/50" />
            <ImageUploadField
              label="Variante mode clair (optionnelle)"
              subtitle="S'affiche uniquement en thème clair si spécifiée."
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
            <h2 className="text-lg font-bold text-zinc-100">Statut de publication</h2>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl">
            <div className="flex gap-3">
              {STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                const locked = (isLockedByBrandMode || isLockedByBrandVisibility) && opt.value === "PUBLISHED";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={readOnly || locked}
                    onClick={() => setStatus(opt.value)}
                    className={`
                      relative flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300
                      ${active 
                        ? "bg-zinc-100 border-zinc-100 shadow-xl shadow-zinc-100/10" 
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"}
                      ${locked ? "opacity-30 grayscale cursor-not-allowed" : ""}
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
            {readOnly && (
              <p className="mt-4 text-center text-xs text-amber-500 font-medium">
                Accès limité : modification du statut impossible.
              </p>
            )}
          </div>
        </section>

        <div className="pt-8 border-t border-zinc-900 space-y-4">
          <AdminButton
            type="submit"
            className="w-full"
            size="lg"
            isLoading={saving}
            disabled={readOnly || !brandId || !name || !image}
          >
            {isNew ? "Créer le parfum" : "Enregistrer les modifications"}
          </AdminButton>
          
          {!isNew && !readOnly && (
            <div className="pt-4 flex flex-col items-center">
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-[13px] font-bold text-red-500/70 hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  Supprimer ce parfum
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl w-full animate-in zoom-in-95">
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Suppression irréversible ?</p>
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
