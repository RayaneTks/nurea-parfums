"use client";

import { useRef, useState } from "react";
import { Download, ImagePlus, Share2, Trash2, X } from "lucide-react";
import { Button } from "@/ui/primitives/Button";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { cn } from "@/lib/utils";

export type MediaItem = {
  id: string;
  url: string;
  label: string | null;
  width: number;
  height: number;
};

type MediaGalleryProps = {
  items: MediaItem[];
  /** Nom de fichier proposé au téléchargement, sans extension. */
  fileNameFor: (item: MediaItem) => string;
  onAdd?: (files: FileList) => void;
  onDelete?: (item: MediaItem) => void;
  busy?: boolean;
  readOnly?: boolean;
  emptyHint?: string;
};

/**
 * Récupère un visuel sur l'appareil.
 *
 * Trois chemins, du plus utile au plus universel :
 *
 * 1. **Partage natif avec fichier** — le seul qui fonctionne vraiment sur un
 *    iPhone, et surtout en application installée : il ouvre la feuille de
 *    partage, d'où le visuel part directement vers Snapchat, ou s'enregistre
 *    dans Photos. C'est exactement le geste visé.
 * 2. **Téléchargement d'un blob** — sur ordinateur. Un `<a download>` pointant
 *    droit sur Supabase serait ignoré : l'attribut `download` ne s'applique pas
 *    en cross-origin, le navigateur se contenterait d'ouvrir l'image. On
 *    télécharge donc les octets d'abord, et on enregistre depuis une URL blob,
 *    de même origine par construction.
 * 3. **Ouverture dans un onglet** — dernier recours, si le fetch échoue
 *    (hors ligne, CORS) : au moins l'image reste atteignable par un appui long.
 */
async function saveMedia(item: MediaItem, fileName: string): Promise<void> {
  let blob: Blob;
  try {
    const res = await fetch(item.url, { mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    blob = await res.blob();
  } catch {
    window.open(item.url, "_blank", "noopener");
    return;
  }

  const ext = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "webp";
  const file = new File([blob], `${fileName}.${ext}`, { type: blob.type || "image/webp" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: fileName });
      return;
    } catch {
      // Partage refusé ou annulé : on retombe sur l'enregistrement direct.
    }
  }

  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Laisser le temps au navigateur de démarrer l'enregistrement avant de
  // révoquer l'URL : révoquée trop tôt, Safari abandonne le fichier.
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/**
 * Galerie de visuels : voir, récupérer, retirer.
 *
 * Brique neutre — elle ne sait rien des parfums. Le métier est apporté par
 * `fileNameFor` et les callbacks.
 */
export function MediaGallery({
  items,
  fileNameFor,
  onAdd,
  onDelete,
  busy = false,
  readOnly = false,
  emptyHint,
}: MediaGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (item: MediaItem) => {
    setSaving(item.id);
    try {
      await saveMedia(item, fileNameFor(item));
    } finally {
      setSaving(null);
    }
  };

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { canShare?: unknown }).canShare === "function";

  return (
    <Stack gap={3}>
      {items.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-[var(--admin-text-muted)]">
          {emptyHint ?? "Aucun visuel pour l'instant."}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setPreview(item)}
                aria-label={`Ouvrir ${item.label ?? "le visuel"}`}
                className={cn(
                  "relative block w-full overflow-hidden rounded-[10px]",
                  "border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] tap-scale",
                )}
                style={{ aspectRatio: "9 / 16" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.label ?? ""}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && onAdd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) onAdd(e.target.files);
              // Réinitialiser permet de re-choisir le MÊME fichier juste après
              // un échec : sans ça, `change` ne se déclenche pas une seconde fois.
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            size="md"
            fullWidth
            isLoading={busy}
            leadingIcon={<ImagePlus size={16} />}
            onClick={() => inputRef.current?.click()}
          >
            Ajouter des visuels
          </Button>
        </>
      ) : null}

      {preview ? (
        <div
          className="admin-theme fixed inset-0 flex flex-col bg-black/90"
          style={{ zIndex: "var(--admin-z-modal)" }}
          role="dialog"
          aria-modal="true"
          aria-label={preview.label ?? "Visuel"}
        >
          <div className="flex justify-end p-2" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
            <button
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Fermer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/90 tap-scale"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.label ?? ""}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div
            className="px-4 pt-3"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <HStack gap={2} wrap>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={saving === preview.id}
                leadingIcon={canShareFiles ? <Share2 size={16} /> : <Download size={16} />}
                onClick={() => void save(preview)}
              >
                {canShareFiles ? "Partager / Enregistrer" : "Télécharger"}
              </Button>
              {!readOnly && onDelete ? (
                <Button
                  variant="ghost"
                  size="lg"
                  leadingIcon={<Trash2 size={16} />}
                  onClick={() => {
                    const target = preview;
                    setPreview(null);
                    onDelete(target);
                  }}
                >
                  Retirer
                </Button>
              ) : null}
            </HStack>
          </div>
        </div>
      ) : null}
    </Stack>
  );
}
