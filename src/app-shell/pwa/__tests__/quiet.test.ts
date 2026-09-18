import { describe, expect, it } from "vitest";
import { DRAFT_KEYS, writeDraft, type StorageLike } from "../../hooks/draft-store";
import { screenIsQuiet } from "../quiet";

/**
 * « Nouvelle version prête » ne s'affiche jamais pendant une saisie (04 §14.3, 07 J16). Les trois
 * signes d'une saisie en cours, éprouvés un par un.
 */

function memory(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

type FakeDoc = {
  activeElement: { tagName: string; isContentEditable: boolean } | null;
  querySelector: () => object | null;
};

const CALME: FakeDoc = { activeElement: { tagName: "BODY", isContentEditable: false }, querySelector: () => null };

function doc(overrides: Partial<FakeDoc>) {
  return { ...CALME, ...overrides } as unknown as Document;
}

describe("écran calme (04 §14.3)", () => {
  it("un écran sans saisie, sans couche et sans brouillon est calme", () => {
    expect(screenIsQuiet(doc({}), memory())).toBe(true);
  });

  it.each([["INPUT"], ["TEXTAREA"], ["SELECT"]])("un %s focalisé n'est pas calme", (tagName) => {
    expect(screenIsQuiet(doc({ activeElement: { tagName, isContentEditable: false } }), memory())).toBe(false);
  });

  it("un champ `contenteditable` focalisé n'est pas calme", () => {
    expect(screenIsQuiet(doc({ activeElement: { tagName: "DIV", isContentEditable: true } }), memory())).toBe(false);
  });

  it("une sheet, un dialogue ou la palette ouverts ne sont pas calmes", () => {
    expect(screenIsQuiet(doc({ querySelector: () => ({}) }), memory())).toBe(false);
  });

  it("un brouillon de vente en cours n'est pas calme, un brouillon expiré l'est", () => {
    const storage = memory();
    writeDraft(storage, DRAFT_KEYS.vendre, { lignes: 1 }, 1_000);
    expect(screenIsQuiet(doc({}), storage, 1_000)).toBe(false);
    // 24 h plus tard : `readDraft` le jette, il n'y a plus de ticket en cours.
    expect(screenIsQuiet(doc({}), storage, 1_000 + 25 * 60 * 60 * 1000)).toBe(true);
  });

  it("sans stockage lisible (navigation privée), l'absence de brouillon ne bloque rien", () => {
    expect(screenIsQuiet(doc({}), null)).toBe(true);
  });
});
