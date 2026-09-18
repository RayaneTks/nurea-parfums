"use client";

import { Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { routes } from "@/app-shell/routes";
import { Button } from "@/ui/primitives/Button";
import { EXPORT_SESSION_MESSAGE, downloadBlob, exportFile } from "./export-file";

/**
 * « Exporter » (06 E03, action d'en-tête de la vue Ventes) : le CSV de la période affichée
 * (`GET /api/admin/export/compta?du=&au=`), une ligne par paiement — la somme de « Encaissé (€) » est l'Encaissé
 * de l'écran.
 */
export function ExportButton({ url, fileName }: { url: string; fileName: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await exportFile(url, fileName, { fetch: window.fetch.bind(window), navigator, download: downloadBlob });
      if (outcome === "downloaded") showToast({ type: "success", message: "Export téléchargé" });
      if (outcome === "session-expired") {
        showToast({ type: "error", message: EXPORT_SESSION_MESSAGE });
        router.replace(routes.connexion({ retour: `${window.location.pathname}${window.location.search}` }));
      }
    } catch (cause) {
      showToast({ type: "error", message: cause instanceof Error ? cause.message : String(cause), actionLabel: "Réessayer", onAction: () => void run() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="text" size="sm" leadingIcon={<Share size={16} aria-hidden />} isLoading={busy} onClick={() => void run()} data-export-compta>
      Exporter
    </Button>
  );
}
