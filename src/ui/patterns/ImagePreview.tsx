"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../primitives/Button";

export type ImageFrame = "portrait" | "square" | "landscape";

type ImagePreviewProps = {
  /** URL distante actuelle (chaîne vide : pas d'image). */
  value: string;
  onSelectFile: (file: File) => Promise<void> | void;
  /** Absent : pas de bouton « Supprimer ». */
  onClear?: () => void;
  /**
   * Cadre de l'aperçu. L'image y est toujours CONTENUE, jamais rognée : le
   * cadre montre ce qui sera publié, pas une découpe de plus.
   */
  frame?: ImageFrame;
  label?: string;
  hint?: string;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  accept?: string;
  uploading?: boolean;
  className?: string;
};

const frameClass: Record<ImageFrame, string> = {
  portrait: "aspect-[3/4]",
  square: "aspect-square",
  landscape: "aspect-[4/3]",
};

const sizeClass = { sm: "w-20", md: "w-28", lg: "w-40" } as const;
const sizesAttr = { sm: "80px", md: "112px", lg: "160px" } as const;

/**
 * Aperçu d'image avec envoi et remplacement. Pendant l'envoi, l'aperçu local
 * (`objectURL`) s'affiche aussitôt : le retour est immédiat, même sur un
 * réseau lent.
 */
export function ImagePreview({
  value,
  onSelectFile,
  onClear,
  frame = "portrait",
  label,
  hint,
  readOnly = false,
  size = "md",
  accept = "image/*",
  uploading = false,
  className,
}: ImagePreviewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!localUrl) return;
    return () => URL.revokeObjectURL(localUrl);
  }, [localUrl]);

  // Une nouvelle URL distante (envoi réussi) remplace l'aperçu local.
  useEffect(() => {
    if (value) setLocalUrl(null);
  }, [value]);

  const handleFile = async (file: File | null) => {
    if (!file || readOnly) return;
    setLocalUrl(URL.createObjectURL(file));
    try {
      await onSelectFile(file);
    } catch {
      // L'aperçu local reste : l'utilisateur voit ce qu'il a choisi, et peut réessayer.
    }
  };

  const trigger = () => {
    if (readOnly || uploading) return;
    fileRef.current?.click();
  };

  const displayUrl = localUrl ?? value;
  const hasImage = displayUrl.trim().length > 0;

  return (
    <div className={cn("w-full", className)}>
      {label ? <p className="admin-type-caption mb-1.5 font-medium text-[var(--admin-text-muted)]">{label}</p> : null}

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={trigger}
          disabled={readOnly}
          aria-label={label ? `${label} : ${hasImage ? "remplacer" : "importer"}` : "Image"}
          className={cn(
            "group relative shrink-0 overflow-hidden rounded-[var(--admin-radius-md)]",
            "border border-[var(--admin-border-strong)] bg-[var(--admin-surface-muted)]",
            frameClass[frame],
            sizeClass[size],
            readOnly ? null : "tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          )}
        >
          {hasImage ? (
            <Image
              src={displayUrl}
              alt=""
              fill
              className="object-contain p-2"
              sizes={sizesAttr[size]}
              unoptimized={localUrl !== null}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[var(--admin-text-subtle)]">
              <Upload size={20} aria-hidden />
            </span>
          )}

          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--admin-overlay)]">
              <Loader2 size={22} className="animate-spin text-[var(--admin-on-accent)]" aria-hidden />
            </span>
          ) : null}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {hint ? <p className="admin-type-caption text-[var(--admin-text-muted)]">{hint}</p> : null}
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            disabled={uploading || readOnly}
            onChange={(e) => {
              void handleFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          {readOnly ? null : (
            <Button
              variant="secondary"
              size="sm"
              isLoading={uploading}
              leadingIcon={<Upload size={14} />}
              onClick={trigger}
              fullWidth
            >
              {uploading ? "Envoi…" : hasImage ? "Remplacer" : "Importer"}
            </Button>
          )}
          {hasImage && onClear && !readOnly ? (
            <Button
              variant="text"
              size="sm"
              leadingIcon={<X size={14} />}
              className="self-start text-[var(--admin-danger)]"
              onClick={() => {
                setLocalUrl(null);
                onClear();
              }}
            >
              Supprimer
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
