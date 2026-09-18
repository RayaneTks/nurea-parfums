import { describe, expect, it, vi } from "vitest";
import { EXPORT_FAILED_MESSAGE, exportFile } from "../export-file";

const csv = () => new Response("﻿Date;Document\r\n", { status: 200, headers: { "Content-Type": "text/csv" } });

describe("« Exporter » : partage natif, sinon téléchargement (06 E03)", () => {
  it("ouvre la feuille de partage avec le fichier quand l'appareil sait partager des fichiers", async () => {
    const share = vi.fn(async () => undefined);
    const download = vi.fn();
    const outcome = await exportFile("/api/admin/export/compta", "compta.csv", {
      fetch: vi.fn(async () => csv()),
      navigator: { share, canShare: () => true },
      download,
    });
    expect(outcome).toBe("shared");
    expect(share).toHaveBeenCalledOnce();
    expect(download).not.toHaveBeenCalled();
  });

  it("feuille fermée : refus, rien n'est téléchargé", async () => {
    const download = vi.fn();
    const outcome = await exportFile("/x", "compta.csv", {
      fetch: vi.fn(async () => csv()),
      navigator: { share: vi.fn(async () => Promise.reject(Object.assign(new Error("fermée"), { name: "AbortError" }))), canShare: () => true },
      download,
    });
    expect(outcome).toBe("cancelled");
    expect(download).not.toHaveBeenCalled();
  });

  it("sans partage de fichiers (ordinateur) : téléchargement du fichier nommé", async () => {
    const download = vi.fn();
    expect(await exportFile("/x", "compta-2026-09-01-au-2026-09-30.csv", { fetch: vi.fn(async () => csv()), download })).toBe("downloaded");
    expect(download).toHaveBeenCalledWith(expect.any(Blob), "compta-2026-09-01-au-2026-09-30.csv");
  });

  it("session expirée et panne se distinguent", async () => {
    expect(await exportFile("/x", "c.csv", { fetch: vi.fn(async () => new Response("{}", { status: 401 })), download: vi.fn() })).toBe("session-expired");
    await expect(exportFile("/x", "c.csv", { fetch: vi.fn(async () => new Response("{}", { status: 500 })), download: vi.fn() })).rejects.toThrow(EXPORT_FAILED_MESSAGE);
  });
});
