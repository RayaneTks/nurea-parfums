import { describe, expect, it, vi } from "vitest";
import { cropFor } from "../ImageField";
import { shareOrCopy } from "../ShareButton";

describe("ShareButton — shareOrCopy", () => {
  const payload = { title: "Récap", text: "Encaissé : 240 €" };

  it("feuille de partage iOS quand elle existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareOrCopy(payload, { share, clipboard: { writeText } })).toBe("shared");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("une annulation n'est ni un échec ni une copie", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("annulé"), { name: "AbortError" }));
    const writeText = vi.fn();
    expect(await shareOrCopy(payload, { share, clipboard: { writeText } })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("repli : copie dans le presse-papiers", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy({ ...payload, url: "https://x.test/r" }, { clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("Encaissé : 240 €\nhttps://x.test/r");
  });

  it("ni partage ni presse-papiers : indisponible", async () => {
    expect(await shareOrCopy(payload, undefined)).toBe("unavailable");
    const writeText = vi.fn().mockRejectedValue(new Error("refusé"));
    expect(await shareOrCopy(payload, { clipboard: { writeText } })).toBe("unavailable");
  });
});

describe("ImageField — un logo n'est jamais recadré (règle projet)", () => {
  it("parfum : portrait ; logo : aucun recadrage", () => {
    expect(cropFor("perfume")).toBe("portrait");
    expect(cropFor("logo")).toBe("none");
  });
});
