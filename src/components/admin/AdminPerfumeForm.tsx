"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { categories } from "@/lib/data";

const dbCategories = categories.filter((c) => c !== "Tout voir");

type BrandOpt = { id: string; name: string };

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
  "block text-[12px] font-medium uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]";

export function AdminPerfumeForm({ perfumeId }: { perfumeId?: string }) {
  const router = useRouter();
  const isNew = !perfumeId;
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const [brandId, setBrandId] = useState("");
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

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

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
      setError("Ajoutez au moins une marque depuis la liste admin avant de créer un parfum.");
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

  if (loading) {
    return (
      <div className="space-y-5 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4 md:p-8">
        <div className="h-9 max-w-xs animate-pulse rounded-sm bg-[var(--nurea-border)]" />
        <div className="h-12 w-full animate-pulse rounded-sm bg-[var(--nurea-border)]" />
        <div className="h-12 w-full animate-pulse rounded-sm bg-[var(--nurea-border)]" />
        <div className="h-40 w-full max-w-sm animate-pulse rounded-sm bg-[var(--nurea-border)]" />
        <p className="text-[13px] text-[var(--nurea-text-muted)]">Chargement de la fiche…</p>
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
        className="mx-auto max-w-2xl space-y-6 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4 pb-28 md:space-y-7 md:p-8 md:pb-10"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl text-[var(--nurea-text)] md:text-3xl">
              {isNew ? "Nouveau parfum" : `Modifier #${perfumeId}`}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--nurea-text-subtle)]">
              Champs obligatoires : marque, nom, catégorie, image principale.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-sm border border-[var(--nurea-border-hover)] px-4 text-[13px] font-medium text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-text)] md:min-h-0 md:py-2"
          >
            ← Liste
          </Link>
        </div>

        {readOnly ? (
          <p className="rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)] px-3 py-2 text-[13px] text-[var(--nurea-text-muted)]">
            Lecture seule : vous pouvez consulter la fiche, pas l’enregistrer.
          </p>
        ) : null}

        {isNew && brands.length === 0 ? (
          <p className="rounded-sm border border-[var(--nurea-accent)]/40 bg-[var(--nurea-accent-subtle)] px-3 py-2 text-[13px] text-[var(--nurea-text)]">
            Créez d’abord au moins une marque depuis la liste admin, puis revenez sur cette page.
          </p>
        ) : null}

        {error ? (
          <p
            ref={errorRef}
            className="rounded-sm border border-[var(--nurea-accent)]/50 bg-[var(--nurea-accent-subtle)] px-3 py-2 text-[14px] text-[var(--nurea-accent)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <label className={labelClass}>
          Marque
          <select
            required
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="">— Choisir une marque —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Nom du parfum
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            autoComplete="off"
            className={inputTransparentClass}
          />
        </label>

        <label className={labelClass}>
          Catégorie
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

        <div>
          <span className={labelClass}>Image principale</span>
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
            <label className="btn-nurea flex min-h-12 w-full cursor-pointer items-center justify-center text-center text-[12px] tracking-[0.1em] sm:w-auto sm:min-w-[200px]">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                className="sr-only"
                disabled={uploading || readOnly}
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
              {uploading ? "Envoi en cours…" : "Importer une image (Supabase)"}
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
          Image thème clair (optionnel)
          <input
            value={imageLight}
            onChange={(e) => setImageLight(e.target.value)}
            disabled={readOnly}
            className={inputTransparentClass}
          />
        </label>

        <label className={labelClass}>
          Image thème sombre (optionnel)
          <input
            value={imageDark}
            onChange={(e) => setImageDark(e.target.value)}
            disabled={readOnly}
            className={inputTransparentClass}
          />
        </label>

        <label className={labelClass}>
          Statut publication
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

        <details className="rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)]/40 open:bg-[var(--nurea-bg)]/60">
          <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-medium text-[var(--nurea-text)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Recherche et métadonnées
              <span className="text-[12px] font-normal text-[var(--nurea-text-subtle)]">Alias, tags, gammes</span>
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
            className="btn-nurea btn-accent w-full justify-center text-[13px] tracking-[0.12em] disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : isNew ? "Créer le parfum" : "Enregistrer les modifications"}
          </button>
        </div>
      </form>

      {!readOnly ? (
        <div
          className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--nurea-border)] bg-[var(--nurea-surface)]/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.18)] backdrop-blur-md md:hidden"
          role="toolbar"
          aria-label="Enregistrer la fiche"
        >
          <div className="mx-auto flex max-w-2xl gap-2">
            <Link
              href="/admin"
              className="btn-nurea flex min-h-12 flex-1 items-center justify-center text-[12px] tracking-[0.08em]"
            >
              Annuler
            </Link>
            <button
              type="submit"
              form="admin-perfume-form"
              disabled={saving || (isNew && brands.length === 0)}
              className="btn-nurea btn-accent flex min-h-12 flex-[1.4] items-center justify-center text-[12px] tracking-[0.08em] disabled:opacity-50"
            >
              {saving ? "…" : isNew ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
