"use client";

import { useState } from "react";
import { ErrorBanner } from "./ErrorBanner";
import { ImagePreview, type ImageFrame } from "./ImagePreview";

/** `perfume` : recadrage portrait WebP. `logo` : proportions d'origine, JAMAIS recadré. */
export type ImageKind = "perfume" | "logo";

/** Consigne transmise à l'envoi. Un logo n'a pas d'autre valeur possible que `none`. */
export type ImageCrop = "portrait" | "none";

export function cropFor(kind: ImageKind): ImageCrop {
  return kind === "logo" ? "none" : "portrait";
}

const frameFor: Record<ImageKind, ImageFrame> = { perfume: "portrait", logo: "square" };

type ImageFieldProps = {
  label: string;
  hint?: string;
  kind: ImageKind;
  value: string;
  onChange: (url: string) => void;
  /**
   * Convertit (WebP), recadre selon `crop`, envoie par URL signée, renvoie
   * l'URL publique. Fournie par la feature catalogue : `src/ui` ne connaît ni
   * le stockage ni les actions (04 §1.3).
   */
  upload: (file: File, options: { crop: ImageCrop }) => Promise<string>;
  /** Après un envoi réussi ou une suppression : l'enregistrement automatique (06 E19). */
  onCommit?: (url: string) => void;
  readOnly?: boolean;
  clearable?: boolean;
};

/**
 * Champ image (05 §3.2) : envoi, aperçu, remplacement, suppression.
 *
 * La règle projet « ne jamais modifier les proportions d'un logo » est portée
 * par le TYPE : `kind="logo"` transmet toujours `crop: "none"` — aucun appelant
 * ne peut demander un recadrage portrait pour une marque.
 * Un envoi échoué s'affiche dans le champ, avec « Réessayer » sur le même fichier.
 */
export function ImageField({
  label,
  hint,
  kind,
  value,
  onChange,
  upload,
  onCommit,
  readOnly = false,
  clearable = true,
}: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState<File | null>(null);

  const send = async (file: File) => {
    setUploading(true);
    setFailed(null);
    try {
      const url = await upload(file, { crop: cropFor(kind) });
      onChange(url);
      onCommit?.(url);
    } catch {
      setFailed(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <ImagePreview
        label={label}
        hint={hint}
        value={value}
        frame={frameFor[kind]}
        readOnly={readOnly}
        uploading={uploading}
        onSelectFile={send}
        onClear={
          clearable && !readOnly && value.trim().length > 0
            ? () => {
                onChange("");
                onCommit?.("");
              }
            : undefined
        }
      />
      <ErrorBanner message={failed ? "Envoi impossible" : null} onRetry={failed ? () => void send(failed) : undefined} />
    </div>
  );
}
