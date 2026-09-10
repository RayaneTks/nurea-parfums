"use client";

import { useState } from "react";
import { Card } from "@/ui/primitives/Card";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { MediaGallery, type MediaItem } from "@/ui/patterns/MediaGallery";
import { prepareStoryImage, uploadStoryImage } from "@/lib/admin/image-utils";
import type { PerfumeMediaRow } from "@/server/catalogue/media";

type PerfumeMediaPanelProps = {
  perfumeId: number;
  perfumeName: string;
  brandName: string;
  initial: PerfumeMediaRow[];
  readOnly?: boolean;
};

/** « nurea-dior-sauvage-story » — reconnaissable dans une pellicule. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Les visuels marketing d'un parfum : les déposer, les revoir, les récupérer.
 *
 * Le besoin est concret : au moment de publier une story, on cherchait la
 * planche du parfum dans une pellicule de quarante images, sans savoir si elle
 * y était encore. Elle vit désormais à côté de la fiche — là où l'on va déjà
 * pour vérifier un prix ou un stock — et se récupère en deux gestes.
 *
 * Ces visuels ne touchent PAS l'image du catalogue : celle-ci reste la seule
 * que la vitrine publie, et c'est elle, pas la galerie, qui décide de la
 * visibilité du parfum.
 */
export function PerfumeMediaPanel({
  perfumeId,
  perfumeName,
  brandName,
  initial,
  readOnly = false,
}: PerfumeMediaPanelProps) {
  const [media, setMedia] = useState<PerfumeMediaRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);

  const items: MediaItem[] = media.map((m) => ({
    id: m.id,
    url: m.url,
    label: m.label,
    width: m.width,
    height: m.height,
  }));

  const handleAdd = async (files: FileList) => {
    setBusy(true);
    /*
     * Les fichiers partent l'un après l'autre, et un échec n'arrête pas les
     * suivants : sur un téléphone, choisir cinq visuels et tout perdre parce
     * que le troisième est un HEIC illisible serait la pire des réponses.
     * On compte, et on dit ce qui est passé.
     */
    let added = 0;
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const prepared = await prepareStoryImage(file);
        const uploaded = await uploadStoryImage(perfumeId, prepared);
        const res = await fetch(`/api/admin/perfumes/${perfumeId}/media`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(uploaded),
        });
        const json = (await res.json().catch(() => ({}))) as {
          media?: PerfumeMediaRow;
          error?: string;
        };
        if (!res.ok || !json.media) {
          errors.push(json.error ?? "Enregistrement refusé.");
          continue;
        }
        const row = json.media;
        setMedia((prev) => [...prev, row]);
        added += 1;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Envoi impossible.");
      }
    }
    setBusy(false);

    if (errors.length === 0) {
      setToast({
        type: "success",
        message: `${added} visuel${added > 1 ? "s ajoutés" : " ajouté"}.`,
      });
    } else {
      setToast({
        type: added > 0 ? "info" : "error",
        message:
          added > 0
            ? `${added} visuel${added > 1 ? "s ajoutés" : " ajouté"}, ${errors.length} en échec : ${errors[0]}`
            : errors[0]!,
      });
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    const res = await fetch(`/api/admin/perfumes/${perfumeId}/media/${target.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(json.error ?? "Suppression impossible.");
    }
    setMedia((prev) => prev.filter((m) => m.id !== target.id));
    setToDelete(null);
    setToast({ type: "success", message: "Visuel retiré." });
  };

  return (
    <>
      <Card padding={3}>
        <HStack justify="between" align="center" className="mb-3">
          <h2 className="text-[14px] font-semibold text-[var(--admin-text)]">
            Visuels story
          </h2>
          <span className="text-[12px] tabular-nums text-[var(--admin-text-subtle)]">
            {media.length}
          </span>
        </HStack>

        <Stack gap={3}>
          <MediaGallery
            items={items}
            fileNameFor={(item) =>
              `nurea-${slugify(brandName)}-${slugify(perfumeName)}${
                item.label ? `-${slugify(item.label)}` : ""
              }`
            }
            onAdd={(files) => void handleAdd(files)}
            onDelete={(item) => setToDelete(item)}
            busy={busy}
            readOnly={readOnly}
            emptyHint="Dépose ici les planches prêtes à publier. Elles ne s'affichent pas sur le site : elles servent à retrouver et récupérer un visuel au moment de faire une story."
          />
        </Stack>
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Retirer ce visuel ?"
        description="Le fichier est supprimé du stockage. Les visuels déjà publiés en story ne sont pas affectés."
        confirmLabel="Retirer"
        onConfirm={handleDelete}
      />

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
