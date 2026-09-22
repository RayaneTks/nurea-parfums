/**
 * Récupérer le CSV de la Compta sur l'appareil (06 E03 « Exporter » : « fichier ouvert dans la feuille de partage
 * iOS ou téléchargé ») : même geste que les visuels story (05 §3.2 `MediaGallery`) — partage natif avec fichier
 * (PWA installée), sinon téléchargement d'un blob de même origine. Fermer la feuille de partage est un refus : rien
 * n'est téléchargé à la place.
 */

export const EXPORT_FAILED_MESSAGE = "Export impossible. Vérifie ta connexion et réessaie.";
export const EXPORT_SESSION_MESSAGE = "Session expirée : reconnecte-toi pour exporter.";

export type ExportOutcome = "shared" | "cancelled" | "downloaded" | "session-expired";

export type ExportEnvironment = {
  fetch: typeof fetch;
  navigator?: Partial<Pick<Navigator, "share">> & { canShare?: (data: { files: File[] }) => boolean };
  download: (blob: Blob, fileName: string) => void;
};

export async function exportFile(url: string, fileName: string, env: ExportEnvironment): Promise<ExportOutcome> {
  let blob: Blob;
  try {
    const response = await env.fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return "session-expired";
    if (!response.ok) throw new Error(String(response.status));
    blob = await response.blob();
  } catch {
    throw new Error(EXPORT_FAILED_MESSAGE);
  }
  const file = new File([blob], fileName, { type: "text/csv" });
  const nav = env.navigator;
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return "shared";
    } catch (cause) {
      if ((cause as { name?: unknown } | null)?.name === "AbortError") return "cancelled";
      // Partage refusé par le système (ordinateur) : repli sur le téléchargement.
    }
  }
  env.download(blob, fileName);
  return "downloaded";
}

/** Téléchargement d'un blob de même origine ; l'URL est révoquée après 10 s (Safari abandonne sinon le fichier). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
