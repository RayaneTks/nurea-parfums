import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";
import { fieldMessages } from "../zod-fr";
import {
  IMAGE_EXTENSION_MESSAGE,
  MAX_IMAGE_BYTES,
  STORY_NEEDS_PERFUME_MESSAGE,
  STORY_PATH_MESSAGE,
  UPLOAD_PATH_MESSAGE,
  addPerfumeMediaInput,
  buildUploadPath,
  convertImageInput,
  convertedImagePath,
  createBrandInput,
  createImageUploadUrlInput,
  createPerfumeInput,
  isStoryPathOf,
  isUploadFor,
  parseUploadPath,
  pricingGridInput,
  reorderPerfumeMediaInput,
  setPerfumeStockInput,
  updatePerfumeInput,
} from "../catalogue";

const BRAND_ID = "5b0f3a1e-2c4d-4e6f-8a9b-0c1d2e3f4a5b";
const STAMP = "1757500000000-1a2b3c4d";

const errors = (result: { success: boolean; error?: ZodError }) =>
  result.success ? {} : fieldMessages(result.error as ZodError);

describe("updatePerfumeInput — le stock n'est jamais dans la fiche (07 J11, 01 §4.5)", () => {
  it("le schéma n'a pas de clé stock", () => {
    expect(Object.keys(updatePerfumeInput.shape)).not.toContain("stock");
  });

  it("une clé stock envoyée par un écran périmé est ignorée, jamais transmise au serveur", () => {
    const parsed = updatePerfumeInput.parse({ id: 12, image: "https://cdn.example/sauvage.webp", stock: 5 });
    expect(parsed).toEqual({ id: 12, image: "https://cdn.example/sauvage.webp" });
    expect("stock" in parsed).toBe(false);
  });

  it("un champ absent n'est pas touché ; une variante claire vidée est effacée", () => {
    expect(updatePerfumeInput.parse({ id: 12, imageLight: "" })).toEqual({ id: 12, imageLight: null });
    expect(updatePerfumeInput.parse({ id: 12 })).toEqual({ id: 12 });
  });

  it("un identifiant qui n'est pas un entier positif vient d'un écran périmé", () => {
    expect(errors(updatePerfumeInput.safeParse({ id: -3 }))).toEqual({
      id: "Cet élément n'est plus reconnu : recharge la page et réessaie.",
    });
  });
});

describe("pricingGridInput — la grille 10 / 50 / 80 ml en un envoi (A-6)", () => {
  it("normalise les saisies clavier et trie par contenance", () => {
    expect(
      pricingGridInput.parse([
        { volumeMl: 80, unitPriceEur: "119,9", unitCostDzd: "30 000", exchangeRate: "277" },
        { volumeMl: 10, unitPriceEur: "25", unitCostDzd: "", exchangeRate: null },
      ]),
    ).toEqual([
      { volumeMl: 10, unitPriceEur: "25.00", unitCostDzd: null, exchangeRate: null },
      { volumeMl: 80, unitPriceEur: "119.90", unitCostDzd: "30000.00", exchangeRate: "277.00" },
    ]);
  });

  it("refuse une contenance hors 10/50/80, un prix vide ou nul, un volume en double", () => {
    expect(errors(pricingGridInput.safeParse([{ volumeMl: 100, unitPriceEur: "120" }]))).toEqual({
      "0.volumeMl": "Choisis un volume : 10, 50 ou 80 ml.",
    });
    expect(
      errors(
        pricingGridInput.safeParse([
          { volumeMl: 50, unitPriceEur: "" },
          { volumeMl: 80, unitPriceEur: "0" },
          { volumeMl: 10, unitPriceEur: "douze" },
        ]),
      ),
    ).toEqual({
      "0.unitPriceEur": "Indique le prix du 50 ml, ou retire ce volume.",
      "1.unitPriceEur": "Indique le prix du 80 ml, ou retire ce volume.",
      "2.unitPriceEur": "Saisis un prix en euros (ex. 120 ou 119,90).",
    });
    expect(
      errors(
        pricingGridInput.safeParse([
          { volumeMl: 80, unitPriceEur: "120" },
          { volumeMl: 80, unitPriceEur: "110" },
        ]),
      ),
    ).toEqual({ "1.volumeMl": "Le 80 ml apparaît deux fois : garde une seule ligne par volume." });
  });

  it("refuse un coût ou un taux illisible", () => {
    expect(
      errors(pricingGridInput.safeParse([{ volumeMl: 50, unitPriceEur: "80", unitCostDzd: "-3", exchangeRate: "0" }])),
    ).toEqual({
      "0.unitCostDzd": "Saisis un coût en dinars (ex. 9000).",
      "0.exchangeRate": "Saisis un taux supérieur à 0 (ex. 277).",
    });
  });
});

describe("createPerfumeInput et createBrandInput", () => {
  it("création minimale : marque et nom ; visible demandé, sans visuel ni grille", () => {
    expect(createPerfumeInput.parse({ brand: { kind: "new", name: " louis vuitton " }, name: " ombre nomade " })).toEqual({
      brand: { kind: "new", name: "louis vuitton" },
      name: "ombre nomade",
      image: "",
      status: "PUBLISHED",
      pricing: [],
    });
  });

  it("refuse une adresse de visuel qui n'en est pas une, une marque absente", () => {
    expect(
      errors(createPerfumeInput.safeParse({ name: "Sauvage", image: "javascript:alert(1)" })),
    ).toEqual({
      brand: "Choisis la marque.",
      image: "Ce visuel n'a pas une adresse valide : renvoie l'image.",
    });
    expect(createPerfumeInput.parse({ brand: { kind: "existing", brandId: BRAND_ID }, name: "Sauvage", image: "/parfums/x.webp" }).image).toBe(
      "/parfums/x.webp",
    );
  });

  it("marque : Sélection et visible par défaut, logo vidé = null ; le slug n'est pas une entrée", () => {
    expect(createBrandInput.parse({ name: "Dior", image: "", slug: "autre" })).toEqual({
      name: "Dior",
      catalogMode: "CURATED",
      status: "PUBLISHED",
      image: null,
    });
  });

  it("stock : entier ≥ 0 ou null (non suivi)", () => {
    expect(setPerfumeStockInput.parse({ id: 3, stock: null })).toEqual({ id: 3, stock: null });
    expect(errors(setPerfumeStockInput.safeParse({ id: 3, stock: -1 }))).toEqual({
      stock: "Indique un stock de 0 ou plus, ou « Non suivi ».",
    });
  });
});

describe("envoi d'images : chemin décidé par le serveur (04 §12)", () => {
  it("seule l'extension survit au nom de fichier de l'appareil", () => {
    expect(createImageUploadUrlInput.parse({ usage: "parfum", extension: "../../IMG_1234.HEIC" })).toEqual({
      usage: "parfum",
      extension: "heic",
    });
    expect(createImageUploadUrlInput.parse({ usage: "logo", extension: ".webp" }).extension).toBe("webp");
    expect(errors(createImageUploadUrlInput.safeParse({ usage: "parfum", extension: "svg" }))).toEqual({
      extension: IMAGE_EXTENSION_MESSAGE,
    });
  });

  it("un visuel story exige son parfum", () => {
    expect(errors(createImageUploadUrlInput.safeParse({ usage: "story", extension: "webp" }))).toEqual({
      perfumeId: STORY_NEEDS_PERFUME_MESSAGE,
    });
  });

  it("original sous tmp/, par usage, jamais le nom du client ; WebP définitif au même horodatage", () => {
    expect(buildUploadPath({ usage: "parfum", extension: "heic" }, STAMP)).toBe(`tmp/perfumes/${STAMP}.heic`);
    expect(buildUploadPath({ usage: "logo", extension: "png" }, STAMP)).toBe(`tmp/brands/${STAMP}.png`);
    expect(buildUploadPath({ usage: "story", perfumeId: 12, extension: "jpg" }, STAMP)).toBe(`tmp/stories/12/${STAMP}.jpg`);
    expect(() => buildUploadPath({ usage: "story", extension: "webp" }, STAMP)).toThrow(RangeError);
    expect(() => buildUploadPath({ usage: "parfum", extension: "webp" }, "../x")).toThrow(RangeError);

    const story = parseUploadPath(`tmp/stories/12/${STAMP}.jpg`);
    expect(story).toEqual({ path: `tmp/stories/12/${STAMP}.jpg`, usage: "story", perfumeId: 12, stamp: STAMP, extension: "jpg" });
    expect(convertedImagePath(story as NonNullable<typeof story>)).toBe(`stories/12/${STAMP}.webp`);
    const logo = parseUploadPath(`tmp/brands/${STAMP}.png`);
    expect(logo && convertedImagePath(logo)).toBe(`brands/${STAMP}.webp`);
    expect(isUploadFor(`tmp/perfumes/${STAMP}.heic`, "parfum")).toBe(true);
    expect(isUploadFor(`tmp/perfumes/${STAMP}.heic`, "logo")).toBe(false);
    expect(isUploadFor(`tmp/stories/12/${STAMP}.png`, "story", 13)).toBe(false);
  });

  it("parseUploadPath : exactement tmp/<dossier>/<horodatage>-<aléa>.<ext>, sinon rien", () => {
    for (const path of [
      `perfumes/${STAMP}.webp`,
      `stories/12/${STAMP}.webp`,
      `tmp/perfumes/../brands/${STAMP}.png`,
      `tmp/perfumes/sub/${STAMP}.png`,
      `tmp/stories/0/${STAMP}.png`,
      `tmp/stories/012/${STAMP}.png`,
      `tmp/stories/12/${STAMP}.svg`,
      `tmp/stories/12/${STAMP}.PNG`,
      `tmp/perfumes/${STAMP}.png?download=1`,
      `/tmp/perfumes/${STAMP}.png`,
      `tmp/autre/${STAMP}.png`,
      "tmp/perfumes/photo.png",
    ]) {
      expect(parseUploadPath(path), path).toBeNull();
    }
  });

  it("isStoryPathOf : exactement stories/<parfum>/<horodatage>-<aléa>.<ext>", () => {
    expect(isStoryPathOf(12, `stories/12/${STAMP}.webp`)).toBe(true);
    for (const path of [
      `stories/13/${STAMP}.webp`,
      `stories/12/../13/${STAMP}.webp`,
      `stories/12/sub/${STAMP}.webp`,
      `perfumes/${STAMP}.webp`,
      `stories/12/${STAMP}.svg`,
      `stories/120/${STAMP}.webp`,
      `/stories/12/${STAMP}.webp`,
      "stories/12/photo.webp",
    ]) {
      expect(isStoryPathOf(12, path), path).toBe(false);
    }
  });

  it("addPerfumeMediaInput : l'original de CE parfum sous tmp/ ; URL, dimensions et poids ne sont pas des entrées", () => {
    const valid = { perfumeId: 12, source: `tmp/stories/12/${STAMP}.heic`, label: null };
    expect(addPerfumeMediaInput.parse(valid)).toEqual(valid);
    for (const source of [`tmp/stories/13/${STAMP}.heic`, `stories/12/${STAMP}.webp`, `tmp/perfumes/${STAMP}.png`]) {
      expect(errors(addPerfumeMediaInput.safeParse({ ...valid, source })), source).toEqual({ source: STORY_PATH_MESSAGE });
    }
    const parsed = addPerfumeMediaInput.parse({ ...valid, url: "https://ailleurs.example/x.webp", width: 1, height: 1, bytes: 1, path: "x" });
    expect(Object.keys(parsed).sort()).toEqual(["label", "perfumeId", "source"]);
  });

  it("convertImageInput : visuel de parfum ou logo, original du même usage sous tmp/", () => {
    expect(convertImageInput.parse({ usage: "logo", source: `tmp/brands/${STAMP}.png` })).toEqual({ usage: "logo", source: `tmp/brands/${STAMP}.png` });
    expect(errors(convertImageInput.safeParse({ usage: "logo", source: `tmp/perfumes/${STAMP}.png` }))).toEqual({ source: UPLOAD_PATH_MESSAGE });
    expect(errors(convertImageInput.safeParse({ usage: "parfum", source: `perfumes/${STAMP}.webp` }))).toEqual({ source: UPLOAD_PATH_MESSAGE });
    expect(convertImageInput.safeParse({ usage: "story", source: `tmp/stories/12/${STAMP}.png` }).success).toBe(false);
    expect(MAX_IMAGE_BYTES).toBe(12 * 1024 * 1024);
  });

  it("reorderPerfumeMediaInput : identifiants bien formés", () => {
    expect(errors(reorderPerfumeMediaInput.safeParse({ perfumeId: 12, orderedIds: ["pas-un-id"] }))).toEqual({
      "orderedIds.0": "Cet élément n'est plus reconnu : recharge la page et réessaie.",
    });
  });
});
