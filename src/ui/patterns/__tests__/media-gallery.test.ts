import { describe, expect, it, vi } from "vitest";
import { SAVE_FAILED_MESSAGE, saveMedia, type MediaItem } from "../MediaGallery";

/**
 * Récupération d'un visuel story (05 §3.2 `MediaGallery`, 06 PC-13) : partage natif avec fichier,
 * feuille fermée = rien, téléchargement de repli sur ordinateur, échec qui remonte sans `window.open`.
 */

const item: MediaItem = { id: "m1", url: "https://stockage.test/stories/12/1757500000001-00000001.webp", label: null, width: 1080, height: 1920 };

const okFetch = () =>
  vi.fn(async () => new Response(new Blob([new Uint8Array(8)], { type: "image/webp" }), { status: 200 })) as unknown as typeof fetch;

describe("MediaGallery — saveMedia", () => {
  it("partage natif : un fichier nommé nurea-<marque>-<parfum>-story.webp, sans téléchargement", async () => {
    const share = vi.fn(async (_data: ShareData) => undefined);
    const download = vi.fn();
    const outcome = await saveMedia(item, "nurea-dior-sauvage-story", {
      fetch: okFetch(),
      navigator: { share, canShare: () => true },
      download,
    });
    expect(outcome).toBe("shared");
    const files = share.mock.calls[0]?.[0].files ?? [];
    expect(files.map((file) => [file.name, file.type])).toEqual([["nurea-dior-sauvage-story.webp", "image/webp"]]);
    expect(download).not.toHaveBeenCalled();
  });

  it("feuille de partage fermée (AbortError) : rien ne se passe, aucun téléchargement de repli", async () => {
    const download = vi.fn();
    const abort = Object.assign(new Error("fermée"), { name: "AbortError" });
    const outcome = await saveMedia(item, "nurea-dior-sauvage-story", {
      fetch: okFetch(),
      navigator: { share: vi.fn().mockRejectedValue(abort), canShare: () => true },
      download,
    });
    expect(outcome).toBe("cancelled");
    expect(download).not.toHaveBeenCalled();
  });

  it("sans partage de fichiers (ordinateur) : téléchargement du blob de même origine", async () => {
    const download = vi.fn();
    expect(await saveMedia(item, "nurea-dior-sauvage-story", { fetch: okFetch(), navigator: {}, download })).toBe("downloaded");
    expect(download).toHaveBeenCalledWith(expect.any(Blob), "nurea-dior-sauvage-story.webp");
  });

  it("récupération impossible : l'échec remonte avec le message de la visionneuse", async () => {
    const failing = vi.fn(async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    await expect(saveMedia(item, "x", { fetch: failing, navigator: {}, download: vi.fn() })).rejects.toThrow(SAVE_FAILED_MESSAGE);
  });
});
