"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X } from "lucide-react";

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
  { value: "PUBLISHED", label: "Visible", color: "bg-emerald-500" },
  { value: "DRAFT", label: "Masqué", color: "bg-amber-400" },
] as const;

const inputCls =
  "block w-full bg-white/5 px-3 py-2.5 text-[15px] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] transition-all duration-200 ease-out-expo disabled:opacity-40 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]";

const labelCls = "block text-[13px] font-medium text-[var(--nurea-text-muted)]";

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function uploadFile(file: File): Promise<string> {
  const prepared = await convertToWebp(file);
  const sign = await fetch("/api/admin/storage/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: prepared.name }),
  });
  const j = (await readJsonSafe<{
    error?: string;
    signedUrl?: string;
    token?: string;
    publicUrl?: string;
  }>(sign)) ?? {};
  if (!sign.ok) throw new Error(j.error ?? "Signature refusée (Supabase configuré ?)");

  const headers: Record<string, string> = {
    "Content-Type": prepared.type || "application/octet-stream",
  };
  if (j.token) headers.Authorization = `Bearer ${j.token}`;

  const put = await fetch(j.signedUrl!, { method: "PUT", body: prepared, headers });
  if (!put.ok) throw new Error(`Upload refusé (${put.status}).`);
  return j.publicUrl ?? "";
}

async function convertToWebp(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/webp") return file;
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1200;
  const ratio = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  bitmap.close();
  if (!blob) return file;
  const safe = file.name.replace(/\.[a-zA-Z0-9]+$/, "");
  return new File([blob], `${safe}.webp`, { type: "image/webp" });
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
      onError(e instanceof Error ? e.message : "Upload echoue");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>
      {subtitle && (
        <p className="mt-0.5 text-[12px] text-[var(--nurea-text-subtle)]">{subtitle}</p>
      )}
      <div className="mt-1.5 space-y-2">
        <div className="relative">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            required={required}
            placeholder="/parfums/… ou https://…"
            className={`${inputCls} pr-11`}
          />
          {!readOnly && value.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--nurea-text-subtle)] transition-colors hover:bg-[var(--nurea-surface-hover)] hover:text-[var(--nurea-text)]"
              aria-label={`Effacer ${label.toLowerCase()}`}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 bg-[var(--nurea-accent-solid)] text-[13px] font-medium text-[var(--nurea-text)] transition-colors hover:bg-[var(--nurea-accent)] disabled:opacity-50">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="sr-only"
            disabled={uploading || readOnly}
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          />
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Envoi…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden />
              Importer
            </>
          )}
        </label>
      </div>
      {preview ? (
      <div className="relative mt-3 aspect-[2/3] w-full max-w-[180px] overflow-hidden bg-[var(--nurea-bg)]">
          {isRemote ? (
            <Image src={preview} alt="Apercu" fill className="object-contain" sizes="180px" />
          ) : (
            <Image src={preview} alt="Apercu" width={360} height={540} className="h-full w-full object-contain" />
          )}
          {allowClear && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center bg-[var(--nurea-overlay)] text-[var(--nurea-text)] transition-colors hover:bg-[var(--nurea-overlay-light)]"
              aria-label="Retirer l'image"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
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
        const newBrand: BrandOpt = {
          id: j.brand.id,
          name: j.brand.name,
          catalogMode: j.brand.catalogMode ?? "CURATED",
          status: j.brand.status ?? "PUBLISHED",
          image: j.brand.image ?? null,
        };
        onBrandCreated(newBrand);
        onSelect(newBrand);
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
      <div className="flex items-center gap-2 bg-white/5 px-3 py-2">
        <span className="flex-1 text-[15px] font-medium text-[var(--nurea-text)]">
          {selectedBrand.name}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-11 w-11 items-center justify-center text-[var(--nurea-text-subtle)] transition-colors hover:bg-white/10 hover:text-[var(--nurea-text)]"
            aria-label="Désélectionner la marque"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={readOnly}
        placeholder="Rechercher ou creer une marque…"
        autoComplete="off"
        className={`${inputCls} pr-11`}
      />
      {!readOnly && query.trim().length > 0 && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--nurea-text-subtle)] transition-colors hover:bg-white/10 hover:text-[var(--nurea-text)]"
          aria-label="Effacer la recherche de marque"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto bg-[var(--nurea-surface)] shadow-[0_16px_42px_var(--nurea-glow)]">
          {filtered.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onSelect(b);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full min-h-[44px] items-center px-3 py-2 text-left text-[14px] text-[var(--nurea-text)] transition-colors hover:bg-[var(--nurea-surface-hover)]"
            >
              {b.name}
            </button>
          ))}
          {!exactMatch && query.trim().length >= 2 && (
            <button
              type="button"
              onClick={createBrand}
              disabled={creating}
              className="flex w-full min-h-[44px] items-center gap-2 border-t border-white/10 px-3 py-2 text-left text-[14px] font-medium text-[var(--nurea-accent)] transition-colors hover:bg-[var(--nurea-surface-hover)]"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Créer « {query.trim()} »
            </button>
          )}
          {filtered.length === 0 && (exactMatch || query.trim().length < 2) && (
            <p className="px-3 py-3 text-[13px] text-[var(--nurea-text-muted)]">Aucun résultat</p>
          )}
        </div>
      )}

      <select
        required
        value={brandId}
        onChange={() => {}}
        tabIndex={-1}
        className="sr-only"
        aria-hidden
      >
        <option value="" />
      </select>
    </div>
  );
}

export function AdminPerfumeForm({ perfumeId }: { perfumeId?: string }) {
  const router = useRouter();
  const isNew = !perfumeId;
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const [brandId, setBrandId] = useState("");
  const [brandNameDraft, setBrandNameDraft] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [imageLight, setImageLight] = useState("");
  const [status, setStatus] = useState("PUBLISHED");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBrands = useCallback(async () => {
    const r = await fetch("/api/admin/brands", {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) return;
      const j = (await readJsonSafe<{ brands: BrandOpt[] }>(r)) ?? { brands: [] };
    setBrands(j.brands ?? []);
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j: { user?: { role: string } }) => {
        if (!cancelled && j.user?.role === "VIEWER") setReadOnly(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isNew || !perfumeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/perfumes/${perfumeId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const j = await readJsonSafe<{ error?: string; perfume?: PerfumePayload }>(r);
        if (!r.ok) throw new Error(j?.error ?? "Chargement impossible");
        if (cancelled || !j?.perfume) return;
        const p = j.perfume;
        setBrandId(p.brandId);
        setName(p.name);
        setImage(p.image);
        setImageLight(p.imageLight ?? "");
        setStatus(p.status);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, perfumeId]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === brandId),
    [brands, brandId],
  );
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
    if (readOnly) return;
    if (!brandId) {
      if (!brandNameDraft.trim()) {
        setError("Sélectionnez une marque ou saisissez-en une nouvelle.");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      let allowCompleteOverride = false;
      if (selectedBrand?.catalogMode === "COMPLETE") {
        const confirmed = window.confirm(
          "Cette marque est en gamme complète. Voulez-vous créer ce parfum quand même ? Il sera automatiquement masqué tant que la marque reste en gamme complète.",
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
        allowCompleteOverride = true;
      }
      const body = {
        brandId,
        brandName: brandNameDraft.trim() || undefined,
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
      const j = await readJsonSafe<{
        error?: string;
        warning?: string | null;
        requiresConfirmation?: boolean;
        perfume?: { id: number };
      }>(r);
      if (!r.ok) throw new Error(j?.error ?? "Enregistrement refusé");
      if (j?.warning) {
        setError(j.warning);
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        <div className="flex items-center gap-2 text-[var(--nurea-text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-[14px]">Chargement…</span>
        </div>
        <div className="h-10 w-48 animate-pulse bg-[var(--nurea-surface)]" />
        <div className="h-10 w-full animate-pulse bg-[var(--nurea-surface)]" />
        <div className="h-10 w-full animate-pulse bg-[var(--nurea-surface)]" />
        <div className="h-40 w-full max-w-[200px] animate-pulse bg-[var(--nurea-surface)]" />
      </div>
    );
  }

  return (
    <>
      <form id="admin-perfume-form" onSubmit={onSubmit} className="space-y-8 bg-[var(--nurea-surface)]/85 p-5 md:p-8">
        {/* Header */}
        <div className="space-y-3">
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] items-center gap-1.5 pr-3 text-[13px] font-medium text-[var(--nurea-text-muted)] transition-colors hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour
          </Link>
          <div>
            <h1 className="font-serif text-[clamp(1.5rem,3vw,2rem)] tracking-[var(--nurea-tracking-tight)] text-[var(--nurea-text)]">
              {isNew ? "Nouveau parfum" : `Modifier #${perfumeId}`}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--nurea-text-muted)]">
              {isNew ? "Publié par défaut dans le catalogue." : "Modifiez les champs, puis enregistrez."}
            </p>
          </div>
        </div>

        {readOnly && (
          <div className="bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
            Lecture seule — vous ne pouvez pas modifier cette fiche.
          </div>
        )}

        {error && (
          <div
            ref={errorRef}
            className="bg-red-500/10 px-4 py-3 text-[14px] text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* --- Identité --- */}
        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-[var(--nurea-text)]">
            Identité
          </legend>

          <div>
            <label className={labelCls}>Marque</label>
            <div className="mt-1.5">
              <BrandCombobox
                brands={brands}
                brandId={brandId}
                onSelect={(b) => {
                  setBrandId(b.id);
                  setBrandNameDraft("");
                  if (b.catalogMode === "COMPLETE" || b.status === "DRAFT") {
                    setStatus("DRAFT");
                  }
                }}
                onClear={() => setBrandId("")}
                readOnly={readOnly}
                onBrandCreated={(b) => setBrands((prev) => [...prev, b].sort((a, z) => a.name.localeCompare(z.name)))}
                onError={setError}
              />
            </div>
            {!brandId && (
              <div className="relative mt-2">
                <input
                  value={brandNameDraft}
                  onChange={(e) => setBrandNameDraft(e.target.value)}
                  disabled={readOnly}
                  placeholder="Nouvelle marque (créée automatiquement)"
                  className={`${inputCls} pr-11`}
                />
                {!readOnly && brandNameDraft.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBrandNameDraft("")}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--nurea-text-subtle)] transition-colors hover:bg-white/10 hover:text-[var(--nurea-text)]"
                    aria-label="Effacer la nouvelle marque"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedBrand?.catalogMode === "COMPLETE" && (
            <p className="text-[12px] text-amber-300">
              Cette marque est en gamme complète: tout parfum créé restera masqué tant que ce mode est actif.
            </p>
          )}
          {selectedBrand?.status === "DRAFT" && (
            <p className="text-[12px] text-amber-300">
              Cette marque est masquée: ce parfum restera masqué tant que la marque n&apos;est pas visible.
            </p>
          )}

          <div>
            <label className={labelCls}>Nom du parfum</label>
            <div className="relative mt-1.5">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly}
                autoComplete="off"
                className={`${inputCls} pr-11`}
              />
              {!readOnly && name.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setName("")}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--nurea-text-subtle)] transition-colors hover:bg-white/10 hover:text-[var(--nurea-text)]"
                  aria-label="Effacer le nom du parfum"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </fieldset>

        {/* --- Visuels --- */}
        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-[var(--nurea-text)]">
            Visuels
          </legend>

          <ImageUploadField
            label="Image du parfum"
            subtitle="Obligatoire. Utilisée par défaut en dark et light."
            value={image}
            onChange={setImage}
            required
            readOnly={readOnly}
            onError={setError}
            allowClear={false}
          />

          <ImageUploadField
            label="Variante mode clair"
            subtitle="Facultative. Si ajoutée, elle remplace l'image principale en light mode."
            value={imageLight}
            onChange={setImageLight}
            readOnly={readOnly}
            onError={setError}
          />
        </fieldset>

        {/* --- Statut --- */}
        <fieldset className="space-y-3">
          <legend className="text-[15px] font-semibold text-[var(--nurea-text)]">
            Publication
          </legend>

          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !readOnly && setStatus(opt.value)}
                  disabled={readOnly || ((isLockedByBrandMode || isLockedByBrandVisibility) && opt.value === "PUBLISHED")}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 px-3 py-2 text-[13px] font-medium transition-all duration-200 ease-out-expo ${
                    active
                      ? "bg-white/15 text-[var(--nurea-text)]"
                      : "bg-white/5 text-[var(--nurea-text-muted)] hover:bg-white/10"
                  }`}
                >
                  <span className={`h-2 w-2 ${opt.color}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {(isLockedByBrandMode || isLockedByBrandVisibility) && (
            <p className="text-[12px] text-amber-300">
              Le statut visible est bloqué par la marque (gamme complète ou marque masquée).
            </p>
          )}
        </fieldset>

        {/* --- Danger zone: delete --- */}
        {!isNew && !readOnly && (
          <div className="bg-red-500/10 p-4">
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="flex min-h-[44px] items-center gap-2 bg-red-500/20 px-4 py-2 text-[13px] font-medium text-red-200 transition-colors hover:bg-red-500/30"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Supprimer ce parfum
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-red-200">
                  Supprimer définitivement ce parfum ? Cette action est irréversible.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex min-h-[44px] items-center justify-center bg-white/5 px-4 py-2 text-[13px] font-medium text-[var(--nurea-text-muted)] transition-colors hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex min-h-[44px] items-center justify-center gap-2 bg-red-700 px-4 py-2 text-[13px] font-semibold text-[var(--nurea-text)] transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    Confirmer la suppression
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop save */}
        <div className="hidden md:block">
          <button
            type="submit"
            disabled={saving || readOnly}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 bg-[var(--nurea-accent-solid)] text-[14px] font-semibold text-[var(--nurea-text)] transition-all duration-200 ease-out-expo hover:bg-[var(--nurea-accent)] active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enregistrement…
              </>
            ) : (
              isNew ? "Créer le parfum" : "Enregistrer"
            )}
          </button>
        </div>
      </form>

      {/* Mobile sticky bar */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[var(--nurea-overlay)]/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-2xl gap-3">
            <Link
              href="/admin"
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 bg-white/5 text-[13px] font-medium text-[var(--nurea-text-muted)] transition-colors active:scale-[0.97]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour
            </Link>
            <button
              type="submit"
              form="admin-perfume-form"
              disabled={saving}
              className="flex min-h-[48px] flex-[1.8] items-center justify-center gap-2 bg-[var(--nurea-accent-solid)] text-[14px] font-semibold text-[var(--nurea-text)] transition-all duration-200 ease-out-expo active:scale-[0.97] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {saving ? "Envoi…" : isNew ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
