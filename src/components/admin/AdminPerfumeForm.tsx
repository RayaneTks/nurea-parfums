"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  Check,
  Eye,
  ImageIcon,
  Loader2,
  Moon,
  Save,
  Search,
  Sparkles,
  Sun,
  Tag,
  Upload,
} from "lucide-react";
import { categories, normalizeForFuzzy } from "@/lib/data";

const dbCategories = categories.filter((c) => c !== "Tout voir");

type BrandOpt = { id: string; name: string };

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

function fuzzyBrandMatch(input: string, brands: BrandOpt[]): BrandOpt | null {
  const q = normalizeForFuzzy(input);
  if (q.length < 2) return null;
  let best: BrandOpt | null = null;
  let bestDist = Infinity;
  for (const b of brands) {
    const n = normalizeForFuzzy(b.name);
    if (n === q) return b;
    if (n.includes(q) || q.includes(n)) return b;
    const d = levenshteinSmall(q, n);
    const threshold = Math.max(2, Math.floor(Math.max(q.length, n.length) * 0.3));
    if (d <= threshold && d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
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

const inputClass =
  "mt-2 block w-full min-h-12 rounded-sm border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-3 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] disabled:pointer-events-none disabled:opacity-50";

const inputTransparentClass =
  "mt-2 block w-full min-h-12 rounded-sm border border-[var(--nurea-border)] bg-transparent px-3 py-3 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] disabled:pointer-events-none disabled:opacity-50";

const textareaClass =
  "mt-2 block w-full rounded-sm border border-[var(--nurea-border)] bg-transparent px-3 py-3 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] disabled:pointer-events-none disabled:opacity-50";

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]";

function FormSection({
  title,
  hint,
  icon: Icon,
  children,
}: {
  title: string;
  hint?: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)]/35">
      <div className="flex items-start gap-3 border-b border-[var(--nurea-border)] bg-[var(--nurea-surface)]/80 px-4 py-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] text-[var(--nurea-cuivre)]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-[var(--nurea-text)]">{title}</h2>
          {hint ? <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">{hint}</p> : null}
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
    </section>
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const [brandId, setBrandId] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(
    dbCategories[0] ?? "Sélections Individuelles"
  );
  const [image, setImage] = useState("");
  const [imageLight, setImageLight] = useState("");
  const [imageDark, setImageDark] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [aliases, setAliases] = useState("");
  const [tags, setTags] = useState("");
  const [classics, setClassics] = useState("");
  const [restore, setRestore] = useState(false);

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
    return () => {
      cancelled = true;
    };
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
        setRestore(false);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, perfumeId]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  async function onUpload(file: File | null) {
    if (!file || readOnly) return;
    setUploading(true);
    setError(null);
    try {
      const sign = await fetch("/api/admin/storage/sign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const j = (await sign.json()) as {
        error?: string;
        signedUrl?: string;
        token?: string;
        publicUrl?: string;
      };
      if (!sign.ok) throw new Error(j.error ?? "Signature refusée (Supabase configuré ?)");

      const headers: Record<string, string> = {
        "Content-Type": file.type || "application/octet-stream",
      };
      if (j.token) {
        headers.Authorization = `Bearer ${j.token}`;
      }

      const put = await fetch(j.signedUrl!, {
        method: "PUT",
        body: file,
        headers,
      });
      if (!put.ok) throw new Error(`Upload refusé (${put.status}).`);
      setImage(j.publicUrl ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (isNew && brands.length === 0) {
      setError("Ajoutez une marque depuis le tableau (section « Gérer les marques ») avant de créer un parfum.");
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
        ...(restore ? { restore: true } : {}),
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

  const brandSuggestion = useMemo(() => {
    if (!isNew || !brandSearch.trim() || brandId) return null;
    return fuzzyBrandMatch(brandSearch, brands);
  }, [isNew, brandSearch, brandId, brands]);

  const selectedBrandName = useMemo(() => {
    if (!brandId) return "";
    return brands.find((b) => b.id === brandId)?.name ?? "";
  }, [brandId, brands]);

  const perfumeDuplicate = useMemo(() => {
    if (!isNew || name.trim().length < 2) return null;
    return fuzzyPerfumeMatch(name, selectedBrandName, existingPerfumes);
  }, [isNew, name, selectedBrandName, existingPerfumes]);

  if (loading) {
    return (
      <div className="space-y-5 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4 md:p-8">
        <div className="flex items-center gap-3 text-[var(--nurea-text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--nurea-accent)]" aria-hidden />
          <p className="text-[14px] font-medium">Chargement de la fiche…</p>
        </div>
        <div className="h-9 max-w-xs animate-pulse bg-[var(--nurea-border)]" />
        <div className="h-12 w-full animate-pulse bg-[var(--nurea-border)]" />
        <div className="h-12 w-full animate-pulse bg-[var(--nurea-border)]" />
        <div className="h-40 w-full max-w-sm animate-pulse bg-[var(--nurea-border)]" />
      </div>
    );
  }

  const imgPreview = image.trim();
  const isRemote = /^https?:\/\//i.test(imgPreview);

  return (
    <>
      <form
        id="admin-perfume-form"
        onSubmit={onSubmit}
        className="mx-auto max-w-2xl space-y-6 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4 pb-28 md:space-y-7 md:p-8 md:pb-10"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)] text-[var(--nurea-accent)] sm:flex">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="font-serif text-[clamp(1.35rem,3.5vw,2rem)] leading-tight text-[var(--nurea-text)]">
                {isNew ? "Nouveau parfum" : `Modifier · #${perfumeId}`}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--nurea-text-subtle)]">
                Obligatoire : marque, nom, catégorie et visuel principal.
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[var(--nurea-border-hover)] px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)] md:min-h-10"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Tableau
          </Link>
        </div>

        {readOnly ? (
          <p className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)] px-4 py-3 text-[13px] text-[var(--nurea-text-muted)]">
            Lecture seule : consultation uniquement, sans enregistrement.
          </p>
        ) : null}

        {isNew && brands.length === 0 ? (
          <p className="border border-[var(--nurea-accent)]/40 bg-[var(--nurea-accent-subtle)] px-4 py-3 text-[13px] text-[var(--nurea-text)]">
            Créez d’abord au moins une marque (section « Gérer les marques » du tableau), puis revenez ici.
          </p>
        ) : null}

        {error ? (
          <p
            ref={errorRef}
            className="border border-[var(--nurea-accent)]/50 bg-[var(--nurea-accent-subtle)] px-4 py-3 text-[14px] text-[var(--nurea-accent)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <FormSection
          title="Identité"
          hint="Rattachez le parfum à une maison et choisissez sa famille olfactive côté vitrine."
          icon={Building2}
        >
        <label className={labelClass}>
          <span className="mb-2 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
            Marque
          </span>
          {isNew && (
            <input
              type="text"
              value={brandSearch}
              onChange={(e) => {
                setBrandSearch(e.target.value);
                const match = fuzzyBrandMatch(e.target.value, brands);
                if (match) setBrandId(match.id);
                else setBrandId("");
              }}
              disabled={readOnly}
              placeholder="Tapez pour chercher une marque existante…"
              autoComplete="off"
              className={`${inputTransparentClass} !mb-2`}
            />
          )}
          {isNew && brandSearch.trim() && brandSuggestion && !brandId && (
            <button
              type="button"
              onClick={() => setBrandId(brandSuggestion.id)}
              className="mb-2 flex w-full min-h-11 items-center gap-2 border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-[13px] text-emerald-300 transition-colors hover:bg-emerald-500/15"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              Vouliez-vous dire « {brandSuggestion.name} » ? Cliquez pour sélectionner.
            </button>
          )}
          {isNew && brandId && (
            <p className="mb-2 flex items-center gap-2 text-[13px] text-emerald-400">
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              Marque sélectionnée : <strong>{selectedBrandName}</strong>
              <button
                type="button"
                onClick={() => { setBrandId(""); setBrandSearch(""); }}
                className="ml-auto text-[11px] text-[var(--nurea-text-muted)] underline"
              >
                Changer
              </button>
            </p>
          )}
          <select
            required
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              const b = brands.find((br) => br.id === e.target.value);
              if (b) setBrandSearch(b.name);
            }}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="">— Ou choisir dans la liste —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <label className={labelClass}>
            <span className="mb-2 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
              Nom du parfum
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly}
              autoComplete="off"
              className={inputTransparentClass}
            />
          </label>
          {isNew && perfumeDuplicate && (
            <div className="mt-2 flex items-start gap-2 border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-[13px] text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p>
                  Un parfum similaire existe déjà : <strong>« {perfumeDuplicate.name} »</strong> ({perfumeDuplicate.brandName}, #{perfumeDuplicate.id}).
                </p>
                <Link
                  href={`/admin/perfumes/${perfumeDuplicate.id}/edit`}
                  className="mt-1 inline-flex items-center gap-1 text-[12px] text-amber-200 underline"
                >
                  Voir la fiche existante →
                </Link>
              </div>
            </div>
          )}
        </div>

        <label className={labelClass}>
          <span className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[var(--nurea-accent)]" aria-hidden />
            Catégorie
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={readOnly}
            className={inputClass}
          >
            {dbCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        </FormSection>

        <FormSection
          title="Visuels"
          hint="URL locale ou distante ; import possible vers Supabase si configuré."
          icon={ImageIcon}
        >
        <div>
          <span className={labelClass}>
            <span className="mb-2 flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
              Image principale
            </span>
          </span>
          <p className="mt-1 text-[13px] text-[var(--nurea-text-subtle)]">
            URL relative (/parfums/…) ou absolue (Supabase, CDN).
          </p>
          <input
            required
            value={image}
            onChange={(e) => setImage(e.target.value)}
            disabled={readOnly}
            placeholder="/parfums/… ou https://…"
            className={inputTransparentClass}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 bg-[var(--nurea-accent)] text-[13px] font-semibold text-white transition-all active:scale-[0.98] sm:w-auto sm:min-w-[220px]">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                className="sr-only"
                disabled={uploading || readOnly}
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Envoi…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" aria-hidden />
                  Importer une photo
                </>
              )}
            </label>
            <span className="text-[12px] leading-snug text-[var(--nurea-text-subtle)]">
              jpg, png, webp, gif — idéal 1024×1536. Sur téléphone, la galerie ou l’appareil photo s’ouvre automatiquement.
            </span>
          </div>
          {imgPreview ? (
            <div className="relative mx-auto mt-4 aspect-[2/3] w-full max-w-[min(100%,280px)] overflow-hidden rounded-sm border border-[var(--nurea-border)] bg-black/10 sm:mx-0">
              {isRemote ? (
                <Image
                  src={imgPreview}
                  alt="Aperçu"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 280px"
                />
              ) : (
                <Image
                  src={imgPreview}
                  alt="Aperçu"
                  width={400}
                  height={600}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          ) : null}
        </div>

        <label className={labelClass}>
          <span className="mb-2 flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
            Image thème clair (optionnel)
          </span>
          <input
            value={imageLight}
            onChange={(e) => setImageLight(e.target.value)}
            disabled={readOnly}
            className={inputTransparentClass}
          />
        </label>

        <label className={labelClass}>
          <span className="mb-2 flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
            Image thème sombre (optionnel)
          </span>
          <input
            value={imageDark}
            onChange={(e) => setImageDark(e.target.value)}
            disabled={readOnly}
            className={inputTransparentClass}
          />
        </label>
        </FormSection>

        <FormSection
          title="Publication"
          hint="Contrôle la présence sur la vitrine publique."
          icon={Eye}
        >
        <label className={labelClass}>
          Statut
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="DRAFT">Brouillon (hors vitrine)</option>
            <option value="PUBLISHED">Publié</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </label>

        {!isNew ? (
          <label
            className={`flex min-h-12 items-center gap-3 rounded-sm border border-[var(--nurea-border)] px-3 py-2 text-[15px] text-[var(--nurea-text)] ${readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={restore}
              disabled={readOnly}
              onChange={(e) => setRestore(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[var(--nurea-accent)]"
            />
            <span>Restaurer sur la vitrine (annuler la suppression douce)</span>
          </label>
        ) : null}
        </FormSection>

        <details className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)]/40 open:bg-[var(--nurea-bg)]/60">
          <summary className="cursor-pointer list-none px-4 py-3.5 text-[14px] font-medium text-[var(--nurea-text)] [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--nurea-accent)]">
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--nurea-cuivre)]" aria-hidden />
                Recherche et métadonnées
              </span>
              <span className="text-right text-[12px] font-normal text-[var(--nurea-text-subtle)]">
                Alias, tags, gammes
              </span>
            </span>
          </summary>
          <div className="space-y-5 border-t border-[var(--nurea-border)] px-4 pb-4 pt-4">
            <label className={labelClass}>
              Alias (recherche), un par ligne
              <textarea
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                disabled={readOnly}
                rows={4}
                className={textareaClass}
              />
            </label>
            <label className={labelClass}>
              Tags, un par ligne
              <textarea
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={readOnly}
                rows={3}
                className={textareaClass}
              />
            </label>
            <label className={labelClass}>
              Gammes complètes, une par ligne
              <textarea
                value={classics}
                onChange={(e) => setClassics(e.target.value)}
                disabled={readOnly}
                rows={3}
                className={textareaClass}
              />
            </label>
          </div>
        </details>

        <div className="hidden md:block">
          <button
            type="submit"
            disabled={saving || readOnly || (isNew && brands.length === 0)}
            className="btn-nurea btn-accent flex w-full items-center justify-center gap-2 text-[13px] tracking-[0.12em] disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden />
                {isNew ? "Créer le parfum" : "Enregistrer les modifications"}
              </>
            )}
          </button>
        </div>
      </form>

      {!readOnly ? (
        <div
          className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--nurea-border)] bg-[var(--nurea-bg)]/98 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 shadow-[0_-12px_48px_rgba(0,0,0,0.3)] backdrop-blur-lg md:hidden"
          role="toolbar"
          aria-label="Enregistrer la fiche"
        >
          <div className="mx-auto flex max-w-2xl gap-3">
            <Link
              href="/admin"
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 border border-[var(--nurea-border-hover)] text-[13px] font-medium text-[var(--nurea-text-muted)] transition-all active:scale-[0.97] active:bg-[var(--nurea-surface-hover)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour
            </Link>
            <button
              type="submit"
              form="admin-perfume-form"
              disabled={saving || (isNew && brands.length === 0)}
              className="flex min-h-[52px] flex-[1.6] items-center justify-center gap-2 bg-[var(--nurea-accent)] text-[13px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              {saving ? "Envoi…" : isNew ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
