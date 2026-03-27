"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { categories, normalizeForFuzzy } from "@/lib/data";
import {
  BRAND_ASSORTMENT_LABELS,
  BRAND_POSITIONING_LABELS,
} from "@/lib/catalog/brandTaxonomy";

const dbCatégories = categories.filter((c) => c !== "Tout voir");

type BrandOpt = { id: string; name: string; assortment: string; positioning: string };
type ExistingPerfume = { id: number; name: string; brandName: string };

function levenshteinSmall(a: string, b: string): number {
  if (a === b) return 0;
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  let prev = Array.from({ length: bn + 1 }, (_, i) => i);
  let curr = new Array<number>(bn + 1);
  for (let i = 1; i <= an; i++) {
    curr[0] = i;
    for (let j = 1; j <= bn; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bn];
}

function fuzzyPerfumeMatch(
  input: string,
  brandName: string,
  existing: ExistingPerfume[],
): ExistingPerfume | null {
  const q = normalizeForFuzzy(input);
  if (q.length < 2) return null;
  const bq = normalizeForFuzzy(brandName);
  const sameBrand = bq.length >= 2
    ? existing.filter((p) => normalizeForFuzzy(p.brandName) === bq)
    : existing;
  let best: ExistingPerfume | null = null;
  let bestDist = Infinity;
  for (const p of sameBrand) {
    const n = normalizeForFuzzy(p.name);
    if (n === q) return p;
    if (n.includes(q) && q.length >= 3) return p;
    const d = levenshteinSmall(q, n);
    const threshold = Math.max(2, Math.floor(Math.max(q.length, n.length) * 0.3));
    if (d <= threshold && d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

type PerfumePayload = {
  id: number;
  brandId: string;
  name: string;
  category: string;
  image: string;
  imageLight: string | null;
  imageDark: string | null;
  status: string;
  deletedAt: string | null;
  brand: { name: string };
  aliases: { alias: string }[];
  tags: { tag: string }[];
  classics: { line: string }[];
};

const ASSORTMENT_KEYS = ["UNSET", "COMPLETE", "CURATED"] as const;
const POSITIONING_KEYS = ["UNSET", "NICHE", "DESIGNER", "ARTISAN"] as const;

const STATUS_OPTIONS = [
  { value: "PUBLISHED", label: "Visible", color: "bg-emerald-500" },
  { value: "DRAFT", label: "Masque", color: "bg-amber-400" },
] as const;

const inputCls =
  "block w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-[15px] text-[#1a1a1a] placeholder:text-[#999] disabled:opacity-40 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]";

const selectCls =
  "block w-full appearance-none rounded-md border border-black/10 bg-white px-3 py-2.5 pr-9 text-[15px] text-[#1a1a1a] disabled:opacity-40 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5]";

const textareaCls =
  "block w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-[15px] text-[#1a1a1a] placeholder:text-[#999] disabled:opacity-40 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]";

const labelCls = "block text-[13px] font-medium text-[#555] dark:text-[#aaa]";

function SelectWrapper({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="relative">
      <select {...props} className={selectCls}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" aria-hidden />
    </div>
  );
}

async function uploadFile(file: File): Promise<string> {
  const prepared = await convertToWebp(file);
  const sign = await fetch("/api/admin/storage/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: prepared.name }),
  });
  const j = (await sign.json()) as {
    error?: string;
    signedUrl?: string;
    token?: string;
    publicUrl?: string;
  };
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
}: {
  label: string;
  subtitle?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  readOnly: boolean;
  onError: (msg: string) => void;
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
        <p className="mt-0.5 text-[12px] text-[#999] dark:text-[#666]">{subtitle}</p>
      )}
      <div className="mt-1.5 space-y-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          required={required}
          placeholder="/parfums/… ou https://…"
          className={inputCls}
        />
        <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-500 text-[13px] font-medium text-white transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50">
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
        <div className="relative mt-3 aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-md border border-black/[0.06] bg-black/[0.02] dark:border-white/[0.06] dark:bg-white/[0.02]">
          {isRemote ? (
            <Image src={preview} alt="Apercu" fill className="object-contain" sizes="180px" />
          ) : (
            <Image src={preview} alt="Apercu" width={360} height={540} className="h-full w-full object-contain" />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            aria-label="Retirer l'image"
          >
            <X className="h-3 w-3" />
          </button>
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
      const j = (await r.json()) as { error?: string; brand?: BrandOpt };
      if (!r.ok) throw new Error(j.error ?? "Création échouée");
      if (j.brand) {
        const newBrand: BrandOpt = {
          id: j.brand.id,
          name: j.brand.name,
          assortment: (j.brand as Record<string, string>).assortment ?? "UNSET",
          positioning: (j.brand as Record<string, string>).positioning ?? "UNSET",
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
      <div className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
        <span className="flex-1 text-[15px] font-medium text-[#1a1a1a] dark:text-[#e5e5e5]">
          {selectedBrand.name}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-black/[0.04] hover:text-[#333] dark:hover:bg-white/[0.06] dark:hover:text-white"
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
        className={inputCls}
      />
      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-[#1a1a1a]">
          {filtered.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onSelect(b);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full min-h-[44px] items-center px-3 py-2 text-left text-[14px] text-[#1a1a1a] transition-colors hover:bg-blue-50 dark:text-[#e5e5e5] dark:hover:bg-white/[0.06]"
            >
              {b.name}
            </button>
          ))}
          {!exactMatch && query.trim().length >= 2 && (
            <button
              type="button"
              onClick={createBrand}
              disabled={creating}
              className="flex w-full min-h-[44px] items-center gap-2 border-t border-black/[0.06] px-3 py-2 text-left text-[14px] font-medium text-blue-500 transition-colors hover:bg-blue-50 dark:border-white/[0.06] dark:hover:bg-white/[0.06]"
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
            <p className="px-3 py-3 text-[13px] text-[#999]">Aucun résultat</p>
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
  const [existingPerfumes, setExistingPerfumes] = useState<ExistingPerfume[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(dbCatégories[0] ?? "Sélections Individuelles");
  const [image, setImage] = useState("");
  const [imageLight, setImageLight] = useState("");
  const [imageDark, setImageDark] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [aliases, setAliases] = useState("");
  const [tags, setTags] = useState("");
  const [classics, setClassics] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBrands = useCallback(async () => {
    const r = await fetch("/api/admin/brands", { credentials: "include" });
    if (!r.ok) return;
    const j = (await r.json()) as { brands: BrandOpt[] };
    setBrands(j.brands ?? []);
  }, []);

  const loadExistingPerfumes = useCallback(async () => {
    const r = await fetch("/api/admin/perfumes?includeDeleted=1", { credentials: "include" });
    if (!r.ok) return;
    const j = (await r.json()) as { perfumes: { id: number; name: string; brand: { name: string } }[] };
    setExistingPerfumes(
      (j.perfumes ?? []).map((p) => ({ id: p.id, name: p.name, brandName: p.brand.name })),
    );
  }, []);

  useEffect(() => {
    loadBrands();
    loadExistingPerfumes();
  }, [loadBrands, loadExistingPerfumes]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { credentials: "include" })
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
        const r = await fetch(`/api/admin/perfumes/${perfumeId}`, { credentials: "include" });
        const j = (await r.json()) as { error?: string; perfume?: PerfumePayload };
        if (!r.ok) throw new Error(j.error ?? "Chargement impossible");
        if (cancelled || !j.perfume) return;
        const p = j.perfume;
        setBrandId(p.brandId);
        setName(p.name);
        setCategory(p.category);
        setImage(p.image);
        setImageLight(p.imageLight ?? "");
        setImageDark(p.imageDark ?? "");
        setStatus(p.status);
        setAliases(p.aliases.map((a) => a.alias).join("\n"));
        setTags(p.tags.map((t) => t.tag).join("\n"));
        setClassics(p.classics.map((c) => c.line).join("\n"));
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

  const selectedBrand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);
  const selectedBrandName = selectedBrand?.name ?? "";
  const isRangeBrand = selectedBrand?.assortment === "COMPLETE";

  useEffect(() => {
    if (!isRangeBrand || !selectedBrand) return;
    setName(selectedBrand.name);
    setCategory("Gammes Complètes");
  }, [isRangeBrand, selectedBrand]);

  const perfumeDuplicate = useMemo(() => {
    if (!isNew || name.trim().length < 2) return null;
    return fuzzyPerfumeMatch(name, selectedBrandName, existingPerfumes);
  }, [isNew, name, selectedBrandName, existingPerfumes]);

  async function patchBrandField(field: "assortment" | "positioning", value: string) {
    if (!brandId) return;
    try {
      const r = await fetch(`/api/admin/brands/${brandId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        setError(j.error ?? "Mise à jour impossible");
        return;
      }
      setBrands((prev) => prev.map((b) => b.id === brandId ? { ...b, [field]: value } : b));
    } catch {
      setError("Erreur réseau");
    }
  }

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
        const j = (await r.json()) as { error?: string };
        throw new Error(j.error ?? "Suppression refusée");
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
      setError("Sélectionnez ou créez une marque.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        brandId,
        name,
        category,
        image,
        imageLight: imageLight.trim() || null,
        imageDark: imageDark.trim() || null,
        status,
        aliases,
        tags,
        classics,
      };

      const url = isNew ? "/api/admin/perfumes" : `/api/admin/perfumes/${perfumeId}`;
      const r = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { error?: string; perfume?: { id: number } };
      if (!r.ok) throw new Error(j.error ?? "Enregistrement refusé");
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
        <div className="flex items-center gap-2 text-[#999]">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-[14px]">Chargement…</span>
        </div>
        <div className="h-10 w-48 animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="h-10 w-full animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="h-10 w-full animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="h-40 w-full max-w-[200px] animate-pulse rounded-md bg-black/[0.04] dark:bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <>
      <form id="admin-perfume-form" onSubmit={onSubmit} className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white sm:text-2xl">
              {isNew ? "Nouveau parfum" : `Modifier #${perfumeId}`}
            </h1>
            <p className="mt-1 text-[13px] text-[#999]">
              {isNew ? "Publié par défaut dans le catalogue." : "Modifiez les champs, puis enregistrez."}
            </p>
          </div>
          <Link
            href="/admin"
            className="flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] dark:text-[#aaa] dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour
          </Link>
        </div>

        {readOnly && (
          <div className="rounded-md bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Lecture seule — vous ne pouvez pas modifier cette fiche.
          </div>
        )}

        {error && (
          <div
            ref={errorRef}
            className="rounded-md bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:bg-red-500/10 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* --- Identité --- */}
        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">
            Identité
          </legend>

          <div>
            <label className={labelCls}>Marque</label>
            <div className="mt-1.5">
              <BrandCombobox
                brands={brands}
                brandId={brandId}
                onSelect={(b) => setBrandId(b.id)}
                onClear={() => setBrandId("")}
                readOnly={readOnly}
                onBrandCreated={(b) => setBrands((prev) => [...prev, b].sort((a, z) => a.name.localeCompare(z.name)))}
                onError={setError}
              />
            </div>
          </div>

          {brandId && selectedBrand && !readOnly && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-black/[0.06] bg-black/[0.01] p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div>
                <label className="text-[12px] font-medium text-[#888]">Mode de catalogue</label>
                <SelectWrapper
                  value={selectedBrand.assortment}
                  onChange={(e) => patchBrandField("assortment", (e.target as HTMLSelectElement).value)}
                >
                  {ASSORTMENT_KEYS.map((k) => (
                    <option key={k} value={k}>{BRAND_ASSORTMENT_LABELS[k].title}</option>
                  ))}
                </SelectWrapper>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#888]">Type</label>
                <SelectWrapper
                  value={selectedBrand.positioning}
                  onChange={(e) => patchBrandField("positioning", (e.target as HTMLSelectElement).value)}
                >
                  {POSITIONING_KEYS.map((k) => (
                    <option key={k} value={k}>{BRAND_POSITIONING_LABELS[k].title}</option>
                  ))}
                </SelectWrapper>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Nom du parfum</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly || isRangeBrand}
              autoComplete="off"
              className={`mt-1.5 ${inputCls}`}
            />
            {isRangeBrand ? (
              <p className="mt-1 text-[12px] text-[#999] dark:text-[#666]">
                En mode « Gamme complète », le nom reprend automatiquement la marque.
              </p>
            ) : null}
            {isNew && perfumeDuplicate && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p>
                    Similaire à « {perfumeDuplicate.name} » ({perfumeDuplicate.brandName}, #{perfumeDuplicate.id}).
                  </p>
                  <Link
                    href={`/admin/perfumes/${perfumeDuplicate.id}/edit`}
                    className="mt-1 inline-flex items-center gap-1 text-[12px] text-amber-700 underline dark:text-amber-200"
                  >
                    Voir la fiche existante
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Catégorie</label>
            <div className="mt-1.5">
              <SelectWrapper
                value={category}
                onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
                disabled={readOnly || isRangeBrand}
              >
                {dbCatégories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </SelectWrapper>
            </div>
          </div>
        </fieldset>

        {/* --- Visuels --- */}
        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">
            Visuels
          </legend>

          <ImageUploadField
            label="Image du parfum"
            subtitle="Utilisée par défaut. Si une variante mode clair est ajoutée, celle-ci ne sera affichée qu'en mode sombre."
            value={image}
            onChange={setImage}
            required
            readOnly={readOnly}
            onError={setError}
          />

          <ImageUploadField
            label="Variante mode clair"
            subtitle="Remplace l'image principale en mode clair."
            value={imageLight}
            onChange={setImageLight}
            readOnly={readOnly}
            onError={setError}
          />
        </fieldset>

        {/* --- Statut --- */}
        <fieldset className="space-y-3">
          <legend className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">
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
                  disabled={readOnly}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-all ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "border-black/[0.06] text-[#888] hover:border-black/[0.12] dark:border-white/[0.06] dark:text-[#666] dark:hover:border-white/[0.12]"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${opt.color}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* --- Recherche --- */}
        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-[#1a1a1a] dark:text-white">
            Recherche
          </legend>

          <div>
            <label className={labelCls}>Noms alternatifs</label>
            <textarea
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              disabled={readOnly}
              rows={3}
              className={`mt-1.5 ${textareaCls}`}
            />
            <p className="mt-1 text-[12px] text-[#999] dark:text-[#666]">
              Autres appellations pour la recherche (ex: Sauvage EDT). Un par ligne.
            </p>
          </div>
          <div>
            <label className={labelCls}>Mots-clés</label>
            <textarea
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={readOnly}
              rows={2}
              className={`mt-1.5 ${textareaCls}`}
            />
            <p className="mt-1 text-[12px] text-[#999] dark:text-[#666]">
              Termes supplémentaires pour la recherche. Un par ligne.
            </p>
          </div>
          <div>
            <label className={labelCls}>Gammes / Déclinaisons</label>
            <textarea
              value={classics}
              onChange={(e) => setClassics(e.target.value)}
              disabled={readOnly}
              rows={2}
              className={`mt-1.5 ${textareaCls}`}
            />
            <p className="mt-1 text-[12px] text-[#999] dark:text-[#666]">
              Autres parfums de la même gamme (ex: Sauvage Elixir). Un par ligne.
            </p>
          </div>
        </fieldset>

        {/* --- Danger zone: delete --- */}
        {!isNew && !readOnly && (
          <div className="rounded-md border border-red-200 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/[0.04]">
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="flex min-h-[44px] items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-[13px] font-medium text-red-600 transition-all hover:bg-red-50 active:scale-[0.98] dark:border-red-500/30 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Supprimer ce parfum
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-red-700 dark:text-red-400">
                  Supprimer définitivement ce parfum ? Cette action est irréversible.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex min-h-[44px] items-center justify-center rounded-md border border-black/10 px-4 py-2 text-[13px] font-medium text-[#666] transition-all hover:bg-black/[0.04] dark:border-white/10 dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
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
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-blue-500 text-[14px] font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50"
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
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#111]/95 md:hidden">
          <div className="mx-auto flex max-w-3xl gap-3">
            <Link
              href="/admin"
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-md border border-black/10 text-[13px] font-medium text-[#666] transition-all active:scale-[0.97] dark:border-white/10 dark:text-[#aaa]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour
            </Link>
            <button
              type="submit"
              form="admin-perfume-form"
              disabled={saving}
              className="flex min-h-[48px] flex-[1.8] items-center justify-center gap-2 rounded-md bg-blue-500 text-[14px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
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
