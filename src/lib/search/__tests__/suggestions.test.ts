import { describe, expect, it } from "vitest";
import { contactHref, MAX_SUGGESTIONS, suggestionsForQuery, suggestionsFromResponse } from "../suggestions";

const item = (id: number, name: string, brand: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  brand,
  category: "Tout voir",
  image: `/img/${id}.webp`,
  ...extra,
});

describe("suggestionsFromResponse", () => {
  it("propose au plus cinq parfums, chacun avec l'adresse de sa page, et le total", () => {
    const results = Array.from({ length: 8 }, (_, i) => item(i + 1, `Parfum ${i + 1}`, "Dior", { brandSlug: "dior" }));
    const out = suggestionsFromResponse({ type: "local_results", query: "dior", results }, "dior");
    expect(out.perfumes).toHaveLength(MAX_SUGGESTIONS);
    expect(out.total).toBe(8);
    expect(out.ask).toBeNull();
    expect(out.perfumes[0]!.href).toBe("/parfums/dior/parfum-1-1");
  });

  it("sans slug de marque (catalogue sans base), l'adresse se déduit du nom de la marque", () => {
    const out = suggestionsFromResponse(
      { type: "local_results", query: "oud", results: [item(12, "Oud Maracujá", "Maison Crivelli", { line: "Extrait" })] },
      "oud"
    );
    expect(out.perfumes[0]!.href).toBe("/parfums/maison-crivelli/oud-maracuja-12");
    expect(out.perfumes[0]!.line).toBe("Extrait");
  });

  it("une référence au catalogue sans carte invite à écrire, demande pré-remplie", () => {
    const out = suggestionsFromResponse(
      { type: "unlisted_match", query: "sauvage", match: { name: "Sauvage", brand: "Dior", on: "perfume" } },
      "sauvage"
    );
    expect(out.perfumes).toEqual([]);
    expect(out.ask).toEqual({ name: "Sauvage", brand: "Dior", brandOnly: false, href: "/contact?parfum=Sauvage&marque=Dior" });
  });

  it("une saisie qui ne vise qu'une marque parle de la marque, pas d'un parfum pris au hasard", () => {
    const out = suggestionsFromResponse(
      { type: "reference_match", query: "xerjoff", match: { name: "Naxos", brand: "Xerjoff", on: "brand" } },
      "xerjoff"
    );
    expect(out.ask?.brandOnly).toBe(true);
    expect(out.ask?.href).toBe("/contact?marque=Xerjoff");
  });

  it("la gamme d'une référence reconnue s'affiche avec sa marque", () => {
    const out = suggestionsFromResponse(
      { type: "reference_match", query: "tobacco", match: { name: "Tobacco Vanille", brand: "Tom Ford", line: "Private Blend", on: "perfume" } },
      "tobacco"
    );
    expect(out.ask?.brand).toBe("Tom Ford (Private Blend)");
  });

  it("rien de reconnu : la saisie part telle quelle dans la demande", () => {
    const out = suggestionsFromResponse({ type: "no_results", query: "zzq" }, "  zzq ");
    expect(out.ask).toEqual({ name: "zzq", brand: undefined, brandOnly: false, href: "/contact?parfum=zzq" });
    expect(suggestionsForQuery(" zzq ")).toEqual(out);
  });

  it("une suggestion externe sans marque n'en invente pas", () => {
    const out = suggestionsFromResponse(
      { type: "external_suggestion", query: "aqua", suggestion: { name: "Acqua di Giò", brand: "—", externalId: "x" } },
      "aqua"
    );
    expect(out.ask?.brand).toBeUndefined();
    expect(out.ask?.href).toMatch(/^\/contact\?parfum=/);
  });
});

describe("contactHref", () => {
  it("sans paramètre, la page Contact nue", () => {
    expect(contactHref({})).toBe("/contact");
  });
});
