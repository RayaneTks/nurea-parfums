"use client";

import { useEffect, useState } from "react";
import { MAX_MEDIA_MESSAGE, MAX_MEDIA_PER_PERFUME, type PerfumeMediaItem } from "@/contracts/catalogue";
import { useConfirm, useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import {
  addPerfumeMediaAction,
  removePerfumeMediaAction,
  reorderPerfumeMediaAction,
  setPerfumeMediaLabelAction,
} from "@/server/catalogue/actions";
import { MediaGallery, type MediaItem } from "@/ui/patterns/MediaGallery";
import { Card } from "@/ui/primitives/Card";
import { depositSummary, storyFileName } from "./catalogue-model";
import { useImageUpload } from "./useImageUpload";

/** Même raison qu'en tête de `useImageUpload` : la conversion d'image n'arrive qu'au premier envoi (04 §15 règle 11). */
const imageConvert = () => import("./image-convert");

type PerfumeMediaPanelProps = {
  perfumeId: number;
  perfumeName: string;
  brandName: string;
  media: readonly PerfumeMediaItem[];
};

export const REMOVE_MEDIA_TITLE = "Retirer ce visuel ?";
export const REMOVE_MEDIA_DESCRIPTION =
  "Il est supprimé de la fiche et du stockage, sans retour possible. Ton téléphone garde les copies déjà enregistrées.";

/**
 * « Visuels story · n » (06 E16 zone 7, PC-13) : les planches prêtes à publier, DISTINCTES du visuel du
 * catalogue — elles ne décident jamais de la visibilité. Dépôt multiple (HEIC compris), chaque original
 * envoyé par URL signée puis converti et rangé par le serveur (WebP, 1920 px, jamais recadré) ; un fichier
 * refusé n'arrête pas les suivants, le bilan est dit en un toast.
 *
 * Les visuels viennent des props (fiche relue après chaque écriture) ; seuls un retrait et un
 * déplacement s'affichent avant la réponse, et se restaurent sur un refus.
 */
export function PerfumeMediaPanel({ perfumeId, perfumeName, brandName, media }: PerfumeMediaPanelProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { uploadStory } = useImageUpload();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [order, setOrder] = useState<readonly string[] | null>(null);

  const add = useAction(addPerfumeMediaAction, { errors: "inline" });
  const remove = useAction(removePerfumeMediaAction, { success: "Visuel retiré" });
  const reorder = useAction(reorderPerfumeMediaAction);
  const label = useAction(setPerfumeMediaLabelAction, { errors: "inline" });

  // La fiche relue fait foi.
  useEffect(() => {
    setHidden(new Set());
    setOrder(null);
  }, [media]);

  const byId = new Map(media.map((item) => [item.id, item]));
  const visible = (order ?? media.map((item) => item.id))
    .map((id) => byId.get(id))
    .filter((item): item is PerfumeMediaItem => item !== undefined && !hidden.has(item.id));

  const deposit = async (files: File[]) => {
    const room = MAX_MEDIA_PER_PERFUME - visible.length;
    if (room <= 0) {
      showToast({ type: "error", message: MAX_MEDIA_MESSAGE });
      return;
    }
    setBusy(true);
    let added = 0;
    const refused: string[] = [];
    for (const [index, file] of files.entries()) {
      if (index >= room) {
        refused.push(`maximum ${MAX_MEDIA_PER_PERFUME} visuels`);
        continue;
      }
      try {
        const uploaded = await uploadStory(file, perfumeId);
        const result = await add.run({ perfumeId, ...uploaded });
        if (!result.ok) throw new Error((await imageConvert()).refusalReason(result.error));
        added += 1;
      } catch (cause) {
        refused.push(cause instanceof Error ? lowerFirst(cause.message.replace(/\.$/, "")) : "envoi impossible");
      }
    }
    setBusy(false);
    showToast({ type: refused.length === 0 ? "success" : added > 0 ? "info" : "error", message: depositSummary(added, refused) });
  };

  const askRemove = (item: MediaItem) => {
    void confirm(
      { title: REMOVE_MEDIA_TITLE, description: REMOVE_MEDIA_DESCRIPTION, confirmLabel: "Retirer", tone: "danger" },
      async () => {
        setHidden((previous) => new Set(previous).add(item.id));
        const result = await remove.run({ perfumeId, mediaId: item.id });
        if (!result.ok) {
          setHidden((previous) => {
            const next = new Set(previous);
            next.delete(item.id);
            return next;
          });
          throw new Error(result.error.message);
        }
      },
    );
  };

  const move = async (item: MediaItem, direction: -1 | 1) => {
    const ids = visible.map((entry) => entry.id);
    const from = ids.indexOf(item.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, item.id);
    setOrder(next);
    const result = await reorder.run({ perfumeId, orderedIds: next });
    if (!result.ok) setOrder(null);
  };

  const rename = async (item: MediaItem, text: string) => {
    const result = await label.run({ perfumeId, mediaId: item.id, label: text });
    if (!result.ok) throw new Error(result.error.fields?.label ?? result.error.message);
  };

  return (
    <Card padding={4}>
      <section className="flex flex-col gap-3" aria-labelledby="visuels-story-titre">
        <div>
          <h2 id="visuels-story-titre" className="admin-type-h3 tnum text-[var(--admin-text)]">
            Visuels story · {visible.length}
          </h2>
          <p className="admin-type-caption mt-0.5 text-[var(--admin-text-muted)]">Pour tes stories. N&apos;apparaissent pas sur la vitrine.</p>
        </div>
        <MediaGallery
          items={visible}
          fileNameFor={(item) => storyFileName(brandName, perfumeName, item.label)}
          onAdd={(files) => void deposit(files)}
          onDelete={askRemove}
          onMove={(item, direction) => void move(item, direction)}
          onLabel={rename}
          busy={busy}
          emptyHint="Aucun visuel story"
        />
      </section>
    </Card>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
