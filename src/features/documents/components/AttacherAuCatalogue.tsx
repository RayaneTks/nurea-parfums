"use client";

import { useState } from "react";
import { useAction } from "@/app-shell/hooks/useAction";
import { useReadRoute } from "@/app-shell/hooks/useReadRoute";
import type { PickerCatalogue } from "@/contracts/catalogue";
import { attachLineToCatalogueAction } from "@/server/documents/actions";
import { Button } from "@/ui/primitives/Button";
import { PerfumePicker } from "./PerfumePicker";

/**
 * « Rattacher » — recoller une vente passée au parfum entré au catalogue depuis.
 *
 * Le cas vient du terrain : on vend un flacon avant de l'avoir inscrit au catalogue, la ligne est
 * donc saisie à la main (« Hors catalogue »). Le parfum entre au catalogue des semaines plus tard, et
 * la vente reste orpheline pour toujours — absente de « Top parfums », de « Achète souvent » et de
 * l'historique du parfum. Ce bouton la recolle, y compris sur une commande livrée depuis longtemps.
 *
 * Le sélecteur est monté SANS `onOffCatalog` : on vient précisément de l'inverse — remplacer une
 * saisie libre par une référence. Proposer de ressaisir un article libre ici n'aurait aucun sens.
 *
 * Ni l'argent ni le stock ne bougent (`attachLineToCatalogue`, côté serveur) : c'est l'identité de ce
 * qui a été vendu qui change, jamais ce qui a été compté.
 */
export function AttacherAuCatalogue({
  documentId,
  lineId,
  perfumeName,
  pickerVersion,
}: {
  documentId: string;
  lineId: string;
  perfumeName: string;
  pickerVersion: string;
}) {
  const [open, setOpen] = useState(false);
  // Le catalogue n'est chargé qu'à l'ouverture : une fiche document n'a pas à le payer pour rien.
  const picker = useReadRoute<PickerCatalogue>(open ? `/api/admin/picker?v=${encodeURIComponent(pickerVersion)}` : null);
  const attach = useAction(attachLineToCatalogueAction, { success: "Ligne rattachée au catalogue" });

  return (
    <>
      <Button
        variant="text"
        size="sm"
        ariaLabel={`Rattacher ${perfumeName} à un parfum du catalogue`}
        onClick={() => setOpen(true)}
      >
        Rattacher
      </Button>
      <PerfumePicker
        open={open}
        onOpenChange={setOpen}
        catalogue={picker.data}
        loading={picker.loading}
        error={picker.error ? { message: "Catalogue indisponible.", onRetry: picker.reload } : null}
        recent={[]}
        title="Rattacher au catalogue"
        onPick={async (perfume) => {
          const result = await attach.run({ documentId, lineId, perfumeId: perfume.id });
          if (result.ok) setOpen(false);
        }}
      />
    </>
  );
}
