import { describe, expect, it } from "vitest";
import loader from "../loader";
import { hasThumbnail, thumbnailOf } from "../thumbnails";

const visual = "https://x.supabase.co/storage/v1/object/public/catalog/perfumes/1790000000000-abcd1234.webp";

describe("vignettes", () => {
  it("seuls les visuels de parfum de notre stockage en ont une", () => {
    expect(hasThumbnail(visual)).toBe(true);
    expect(hasThumbnail(visual.replace("/perfumes/", "/brands/"))).toBe(false);
    expect(hasThumbnail(visual.replace("/perfumes/", "/stories/12/"))).toBe(false);
    expect(hasThumbnail("/placeholder.svg")).toBe(false);
    expect(hasThumbnail(thumbnailOf(visual))).toBe(false);
  });

  it("se nomme à côté de l'original", () => {
    expect(thumbnailOf("perfumes/1790000000000-abcd1234.webp")).toBe("perfumes/1790000000000-abcd1234-640.webp");
    expect(() => thumbnailOf("perfumes/x-640.webp")).toThrow();
  });
});

describe("chargeur d'images", () => {
  it("sert la vignette aux petites largeurs, l'original au-delà", () => {
    expect(loader({ src: visual, width: 384 })).toBe(thumbnailOf(visual));
    expect(loader({ src: visual, width: 640 })).toBe(thumbnailOf(visual));
    expect(loader({ src: visual, width: 1080 })).toBe(visual);
  });

  it("choisit la plus petite déclinaison qui suffit pour la photo d'accueil", () => {
    expect(loader({ src: "/branding/visuel-hero.webp", width: 640 })).toBe("/branding/visuel-hero-750.webp");
    expect(loader({ src: "/branding/visuel-hero.webp", width: 1080 })).toBe("/branding/visuel-hero-1280.webp");
    expect(loader({ src: "/branding/visuel-hero.webp", width: 3840 })).toBe("/branding/visuel-hero.webp");
  });

  it("laisse passer tout le reste tel quel", () => {
    expect(loader({ src: "/placeholder.svg", width: 640 })).toBe("/placeholder.svg");
  });
});
