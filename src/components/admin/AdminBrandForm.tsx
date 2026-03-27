"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Trash2, Upload, X } from "lucide-react";

type BrandPayload = {
  id: string;
  name: string;
  slug: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
};

const MODE_OPTIONS = [
  { value: "CURATED", label: "Sélection" },
  { value: "COMPLETE", label: "Gamme complète" },
] as const;

const STATUS_OPTIONS = [
  { value: "PUBLISHED", label: "Visible", color: "bg-emerald-500" },
  { value: "DRAFT", label: "Masquée", color: "bg-amber-400" },
] as const;

const inputCls =
  "block w-full min-h-[48px] rounded-xl bg-zinc-800/70 px-4 text-[15px] text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 disabled:opacity-40 focus-visible:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

const labelCls = "mb-1.5 block text-[13px] font-medium text-zinc-400";

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
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

function ImageUploadField({
  value,
  readOnly,
  onChange,
  onError,
}: {
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onError: (message: string) => void;
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
    } catch (error) {
      onError(error instanceof Error ? error.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className={labelCls}>Image de marque</span>
      <p className="mt-0.5 text-[12px] text-zinc-500">
        Obligatoire pour une gamme complète. Import image uniquement.
      </p>
      <div className="mt-1.5 space-y-2">
        <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-500 text-[13px] font-medium text-white transition-all duration-200 hover:bg-blue-400 disabled:opacity-50">
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
              Envoi...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden />
              Importer une image
            </>
          )}
        </label>
      </div>
      {preview ? (
        <div className="relative mt-3 aspect-square w-full max-w-[180px] overflow-hidden rounded-xl bg-zinc-800">
          {isRemote ? (
            <Image src={preview} alt="Aperçu image marque" fill className="object-contain" sizes="180px" />
          ) : (
            <Image
              src={preview}
              alt="Aperçu image marque"
              width={360}
              height={360}
              className="h-full w-full object-contain"
            />
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl bg-black/60 text-white backdrop-blur-sm transition-all duration-200 hover:bg-black/80"
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

export function AdminBrandForm({ brandId }: { brandId?: string }) {
  const router = useRouter();
  const isNew = !brandId;
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [catalogMode, setCatalogMode] = useState<"CURATED" | "COMPLETE">("CURATED");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");
  const [image, setImage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { credentials: "include", cache: "no-store" })
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
    if (isNew || !brandId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/admin/brands", {
          credentials: "include",
          cache: "no-store",
        });
        const j = await readJsonSafe<{ error?: string; brands?: BrandPayload[] }>(r);
        if (!r.ok) throw new Error(j?.error ?? "Chargement impossible");
        const found = (j?.brands ?? []).find((brand) => brand.id === brandId);
        if (!found) throw new Error("Marque introuvable.");
        if (cancelled) return;
        setName(found.name);
        setCatalogMode(found.catalogMode);
        setStatus(found.status);
        setImage(found.image ?? "");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, isNew]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  const completeNeedsImage = useMemo(
    () => catalogMode === "COMPLETE" && image.trim().length === 0,
    [catalogMode, image],
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    if (completeNeedsImage) {
      setError("Ajoutez une image: une gamme complète doit obligatoirement avoir un visuel.");
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
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!brandId || readOnly) return;
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/brands/${brandId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await readJsonSafe<{ error?: string }>(r);
      if (!r.ok) throw new Error(j?.error ?? "Suppression refusée");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-[14px]">Chargement...</span>
        </div>
        <div className="h-10 w-48 animate-pulse rounded-xl bg-zinc-900" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-900" />
        <div className="h-40 w-full max-w-[200px] animate-pulse rounded-xl bg-zinc-900" />
      </div>
    );
  }

  return (
    <>
      <form id="admin-brand-form" onSubmit={onSubmit} className="space-y-8 rounded-2xl bg-zinc-900 p-6 md:p-8">
        <div className="space-y-3">
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] items-center gap-1.5 pr-3 text-[13px] text-zinc-500 transition-all duration-200 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour
          </Link>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-zinc-100">
              {isNew ? "Nouvelle marque" : "Modifier la marque"}
            </h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              {isNew
                ? "Créez une fiche marque complète en quelques champs."
                : "Modifiez les champs puis enregistrez les changements."}
            </p>
          </div>
        </div>

        {readOnly && (
          <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-[13px] text-amber-400">
            Lecture seule — vous ne pouvez pas modifier cette fiche.
          </div>
        )}

        {error && (
          <p
            ref={errorRef}
            className="rounded-xl bg-red-500/10 px-4 py-3 text-[14px] text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-zinc-200">Identité</legend>

          <div>
            <label className={labelCls}>Nom de la marque</label>
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
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-zinc-700 hover:text-zinc-300"
                  aria-label="Effacer le nom de la marque"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-zinc-200">Mode catalogue</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODE_OPTIONS.map((option) => {
              const active = catalogMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !readOnly && setCatalogMode(option.value)}
                  disabled={readOnly}
                  className={`flex min-h-[44px] items-center justify-center rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? "bg-zinc-100 font-semibold text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {completeNeedsImage && (
            <p className="text-[12px] text-amber-400">
              Une gamme complète doit avoir une image de marque.
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[15px] font-semibold text-zinc-200">Publication</legend>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !readOnly && setStatus(opt.value)}
                  disabled={readOnly}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? "bg-zinc-100 font-semibold text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${opt.color}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-[15px] font-semibold text-zinc-200">Visuel</legend>
          <ImageUploadField value={image} readOnly={readOnly} onChange={setImage} onError={setError} />
        </fieldset>

        {!isNew && !readOnly && (
          <div className="rounded-xl bg-red-500/10 p-5">
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-[13px] font-medium text-red-400 transition-all duration-200 hover:bg-red-500/30"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Supprimer cette marque
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-red-400">
                  Supprimer définitivement cette marque ? Cette action est irréversible.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-800 px-4 py-2 text-[13px] font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-red-400 disabled:opacity-50"
                  >
                    {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    Confirmer la suppression
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="hidden md:block">
          <button
            type="submit"
            disabled={saving || readOnly}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-500 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Enregistrement...
              </>
            ) : isNew ? (
              "Créer la marque"
            ) : (
              "Enregistrer"
            )}
          </button>
        </div>
      </form>

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800/50 bg-zinc-950/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 backdrop-blur-2xl backdrop-saturate-150 md:hidden">
          <div className="mx-auto flex max-w-2xl gap-3">
            <Link
              href="/admin"
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 text-[13px] font-medium text-zinc-400 transition-all duration-200 hover:bg-zinc-700 active:scale-[0.97]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour
            </Link>
            <button
              type="submit"
              form="admin-brand-form"
              disabled={saving}
              className="flex min-h-[48px] flex-[1.8] items-center justify-center gap-2 rounded-xl bg-blue-500 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-blue-400 active:scale-[0.97] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {saving ? "Envoi..." : isNew ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
