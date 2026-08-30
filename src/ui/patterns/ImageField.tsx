"use client";

import { useState } from "react";
import { ImagePreview } from "./ImagePreview";
import { uploadFile } from "@/lib/admin/image-utils";

type ImageFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  /** Appelé après un upload réussi (ou une suppression) — pour l'auto-save. */
  onCommit?: (url: string) => void;
  onError: (message: string) => void;
  readOnly?: boolean;
  /** Autorise la suppression de l'image (defaut true). */
  clearable?: boolean;
  aspect?: "portrait" | "square" | "landscape";
};

/**
 * Champ image : upload vers le stockage, aperçu, remplacement, suppression.
 *
 * Les formulaires parfum et marque embarquaient chacun leur propre copie de
 * ce composant, avec des styles et des comportements de suppression qui
 * avaient divergé. Une seule implémentation ici.
 */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  onCommit,
  onError,
  readOnly = false,
  clearable = true,
  aspect = "portrait",
}: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
      onCommit?.(url);
    } catch (e) {
      onError(e instanceof Error ? e.message : "L'envoi de l'image a échoué.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ImagePreview
      label={label}
      hint={hint}
      value={value}
      aspect={aspect}
      readOnly={readOnly}
      uploading={uploading}
      onSelectFile={handleFile}
      onClear={
        clearable && !readOnly && value.trim().length > 0
          ? () => {
              onChange("");
              onCommit?.("");
            }
          : undefined
      }
    />
  );
}
