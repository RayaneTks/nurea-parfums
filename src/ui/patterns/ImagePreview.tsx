"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/ui/primitives/Button";
import { cn } from "@/lib/utils";

type ImagePreviewProps = {
  /** URL distante actuelle (string vide = pas d'image). */
  value: string;
  /** Callback quand l'utilisateur sélectionne un nouveau fichier. */
  onSelectFile: (file: File) => Promise<void> | void;
  /** Callback "Supprimer". Si absent, le bouton supprimer est masqué. */
  onClear?: () => void;
  /** Forme du preview. defaut "portrait" (3/4). */
  aspect?: "portrait" | "square" | "landscape";
  /** Label affiché en haut. */
  label?: string;
  /** Sous-titre / hint. */
  hint?: string;
  /** Désactive toute interaction. */
  readOnly?: boolean;
  /** Taille du cadre (largeur Tailwind, ex w-28). defaut "w-28". */
  width?: string;
  /** accept du file input. defaut "image/*". */
  accept?: string;
  /** Affiche l'upload en cours. */
  uploading?: boolean;
  className?: string;
};

const ASPECT_CLASS: Record<NonNullable<ImagePreviewProps["aspect"]>, string> = {
  portrait: "aspect-[3/4]",
  square: "aspect-square",
  landscape: "aspect-[4/3]",
};

/**
 * Cadre de preview d'image avec upload + remplacement.
 * Pendant l'upload, montre un objectURL local pour feedback instantané.
 */
export function ImagePreview({
  value,
  onSelectFile,
  onClear,
  aspect = "portrait",
  label,
  hint,
  readOnly = false,
  width = "w-28",
  accept = "image/*",
  uploading = false,
  className,
}: ImagePreviewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!localUrl) return;
    return () => {
      URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  // Si la value remote est mise à jour (upload OK), purge la preview locale.
  useEffect(() => {
    if (value && localUrl) {
      URL.revokeObjectURL(localUrl);
      setLocalUrl(null);
    }
  }, [value, localUrl]);

  const handleFile = async (file: File | null) => {
    if (!file || readOnly) return;
    const blobUrl = URL.createObjectURL(file);
    setLocalUrl(blobUrl);
    try {
      await onSelectFile(file);
    } catch {
      // Conserve la preview locale en cas d'échec pour que l'utilisateur voie l'image.
    }
  };

  const trigger = () => {
    if (readOnly || uploading) return;
    fileRef.current?.click();
  };

  const displayUrl = localUrl || value;
  const hasImage = displayUrl.trim().length > 0;

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">
          {label}
        </p>
      ) : null}

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={trigger}
          disabled={readOnly}
          aria-label={label ?? "Image"}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-[12px]",
            ASPECT_CLASS[aspect],
            width,
            "border border-[var(--admin-border-strong)] bg-[var(--admin-surface-muted)]",
            !readOnly &&
              "tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
            "group transition-[border-color] duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
          )}
        >
          {hasImage ? (
            <Image
              src={displayUrl}
              alt=""
              fill
              className="object-contain p-2"
              sizes="112px"
              unoptimized={localUrl !== null}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--admin-text-subtle)]">
              <Upload size={20} aria-hidden />
            </div>
          )}

          {uploading || (!readOnly && hasImage) ? (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                uploading ? "opacity-100" : "opacity-0",
                !readOnly && "[@media(hover:hover)]:group-hover:opacity-100",
              )}
              style={{ background: "rgba(0,0,0,0.40)" }}
            >
              {uploading ? (
                <Loader2 size={22} className="animate-spin text-white" aria-hidden />
              ) : (
                <span className="inline-flex flex-col items-center gap-1 text-white">
                  <Upload size={18} aria-hidden />
                  <span className="text-[10px] uppercase tracking-[0.06em]">
                    Remplacer
                  </span>
                </span>
              )}
            </div>
          ) : null}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {hint ? (
            <p className="text-[12px] text-[var(--admin-text-subtle)]">{hint}</p>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            disabled={uploading || readOnly}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            className="sr-only"
            aria-hidden
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={uploading}
            leadingIcon={<Upload size={14} />}
            onClick={trigger}
            disabled={readOnly}
            fullWidth
          >
            {uploading ? "Envoi…" : hasImage ? "Remplacer" : "Importer"}
          </Button>
          {hasImage && onClear && !readOnly ? (
            <button
              type="button"
              onClick={() => {
                if (localUrl) {
                  URL.revokeObjectURL(localUrl);
                  setLocalUrl(null);
                }
                onClear();
              }}
              className="inline-flex items-center gap-1 self-start text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-danger)] tap-scale hover:underline"
            >
              <X size={12} aria-hidden />
              Supprimer
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
