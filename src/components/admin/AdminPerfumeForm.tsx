"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

export function AdminPerfumeForm({ perfumeId }: { perfumeId?: string }) {
  const router = useRouter();
  const isNew = !perfumeId;

  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function onUpload(file: File | null) {
    if (!file) return;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-[13px] text-[var(--nurea-text-muted)]">Chargement…</p>;
  }

  const imgPreview = image.trim();
  const isRemote = /^https?:\/\//i.test(imgPreview);

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-2xl space-y-6 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-6 md:p-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-[var(--nurea-text)]">
          {isNew ? "Nouveau parfum" : `Modifier #${perfumeId}`}
        </h1>
        <Link
          href="/admin"
          className="text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-accent)]"
        >
          Retour liste
        </Link>
      </div>

      {error ? (
        <p className="text-[12px] text-[var(--nurea-accent)]" role="alert">
          {error}
        </p>
      ) : null}

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Marque
        <select
          required
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-2.5 text-[14px] text-[var(--nurea-text)]"
        >
          <option value="">— Choisir —</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Nom du parfum
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[14px] text-[var(--nurea-text)]"
        />
      </label>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Catégorie
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-2.5 text-[14px] text-[var(--nurea-text)]"
        >
          {dbCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
          Image principale (URL)
        </span>
        <input
          required
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="/parfums/… ou URL Supabase"
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--nurea-text)]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer border border-[var(--nurea-border-hover)] px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[var(--nurea-text)] hover:border-[var(--nurea-accent)]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
            />
            {uploading ? "Envoi…" : "Importer (Supabase)"}
          </label>
          <span className="text-[11px] text-[var(--nurea-text-subtle)]">
            Formats : jpg, png, webp, gif — idéal 1024×1536.
          </span>
        </div>
        {imgPreview ? (
          <div className="relative mt-4 aspect-[2/3] max-w-[200px] border border-[var(--nurea-border)] bg-black/20">
            {isRemote ? (
              <Image src={imgPreview} alt="" fill className="object-contain" sizes="200px" />
            ) : (
              <Image
                src={imgPreview}
                alt=""
                width={200}
                height={300}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        ) : null}
      </div>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Image thème clair (optionnel)
        <input
          value={imageLight}
          onChange={(e) => setImageLight(e.target.value)}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--nurea-text)]"
        />
      </label>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Image thème sombre (optionnel)
        <input
          value={imageDark}
          onChange={(e) => setImageDark(e.target.value)}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--nurea-text)]"
        />
      </label>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Statut publication
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-2.5 text-[14px] text-[var(--nurea-text)]"
        >
          <option value="DRAFT">Brouillon (hors vitrine)</option>
          <option value="PUBLISHED">Publié</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
      </label>

      {!isNew ? (
        <label className="flex items-center gap-2 text-[13px] text-[var(--nurea-text-muted)]">
          <input type="checkbox" checked={restore} onChange={(e) => setRestore(e.target.checked)} />
          Restaurer (retirer la suppression douce)
        </label>
      ) : null}

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Alias (recherche), un par ligne
        <textarea
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          rows={3}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--nurea-text)]"
        />
      </label>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Tags, un par ligne
        <textarea
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          rows={2}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--nurea-text)]"
        />
      </label>

      <label className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
        Lignes gammes (Gammes complètes), une par ligne
        <textarea
          value={classics}
          onChange={(e) => setClassics(e.target.value)}
          rows={3}
          className="mt-2 block w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--nurea-text)]"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="btn-nurea btn-accent w-full justify-center disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
