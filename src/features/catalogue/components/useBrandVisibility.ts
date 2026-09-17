"use client";

import { useCallback } from "react";
import type { BrandWrite } from "@/contracts/catalogue";
import type { PublicationStatus } from "@/domain/publication";
import { useConfirm } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { republishBrandPerfumesAction, setBrandVisibilityAction } from "@/server/catalogue/actions";

/** « 8 parfums ont un visuel et redeviendront visibles. » (06 S18) */
export function republishDescription(count: number): string {
  return count === 1
    ? "1 parfum a un visuel et redeviendra visible."
    : `${count} parfums ont un visuel et redeviendront visibles.`;
}

/**
 * Proposer « Republier » après qu'une marque est redevenue visible en Sélection (06 E15, E17, F-4.5-06).
 * Rend la promesse de la fin du dialogue (« Plus tard » compris).
 */
export function useRepublishOffer() {
  const confirm = useConfirm();
  const { run } = useAction(republishBrandPerfumesAction, {
    success: (data) =>
      data.republished === 0
        ? null
        : data.republished === 1
          ? "1 parfum republié"
          : `${data.republished} parfums republiés`,
  });

  return useCallback(
    async (brand: { id: string; name: string }, republishable: number) => {
      if (republishable <= 0) return;
      await confirm(
        {
          title: `Republier les parfums de ${brand.name} ?`,
          description: republishDescription(republishable),
          confirmLabel: "Republier",
          cancelLabel: "Plus tard",
          tone: "primary",
        },
        async () => {
          const result = await run({ id: brand.id });
          if (!result.ok) throw new Error(result.error.message);
        },
      );
    },
    [confirm, run],
  );
}

/**
 * Visibilité d'une marque (T14) : la réserve « Ses 14 parfums seront masqués sur la vitrine. » vient du
 * serveur (`NEEDS_CONFIRMATION`, ouverte par `useAction`) ; redevenue visible en Sélection avec des parfums
 * masqués qui ont un visuel, la marque propose de les republier.
 */
export function useBrandVisibility() {
  const offerRepublish = useRepublishOffer();
  const { run, pending } = useAction(setBrandVisibilityAction);

  const setVisibility = useCallback(
    async (brand: { id: string; name: string }, status: PublicationStatus): Promise<BrandWrite | null> => {
      const result = await run({ id: brand.id, status, confirm: false });
      if (!result.ok) return null;
      if (status === "PUBLISHED") await offerRepublish(brand, result.data.republishable);
      return result.data;
    },
    [run, offerRepublish],
  );

  return { setVisibility, pending };
}
