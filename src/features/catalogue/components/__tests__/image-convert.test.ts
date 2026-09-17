import { describe, expect, it } from "vitest";
import {
  IMAGE_REFUSALS,
  LOGO_MAX_EDGE,
  PERFUME_FRAME,
  catalogueGeometry,
  convertCatalogueImage,
  fitWithin,
  isImageFile,
  portraitCover,
  prepareStoryImage,
  type DecodedImage,
  type Geometry,
  type ImageCodec,
} from "../image-convert";

/**
 * Préparation des images (07 J11, critère « un logo carré 800 × 800 converti garde un rapport 1:1 ») :
 * géométrie pure, et pipeline de conversion éprouvé avec un codec double (Node n'a ni canevas ni
 * `createImageBitmap`).
 */

type FakeImage = DecodedImage & { closed: boolean };

function fakeCodec(size: { width: number; height: number } | "illisible", encodes: readonly string[] = ["image/webp", "image/png", "image/jpeg"]) {
  const drawn: Geometry[] = [];
  const images: FakeImage[] = [];
  const codec: ImageCodec<FakeImage> = {
    async decode() {
      if (size === "illisible") throw new Error("HEIC non pris en charge");
      const image: FakeImage = {
        ...size,
        closed: false,
        close: () => {
          image.closed = true;
        },
      };
      images.push(image);
      return image;
    },
    async encode(_image, geometry, _quality, type) {
      drawn.push(geometry);
      // Un moteur qui ne sait pas encoder le type demandé rend du PNG (comportement de Safari).
      return new Blob([new Uint8Array(geometry.output.width % 7)], { type: encodes.includes(type) ? type : "image/png" });
    },
  };
  return { codec, drawn, images };
}

const file = (name: string, type: string, bytes = 1024) => new File([new Uint8Array(bytes)], name, { type });

describe("géométrie", () => {
  it("un logo carré 800 × 800 garde un rapport 1:1 : ni recadré ni agrandi", () => {
    const geometry = catalogueGeometry("none", 800, 800);
    expect(geometry.source).toEqual({ x: 0, y: 0, width: 800, height: 800 });
    expect(geometry.output).toEqual({ width: 800, height: 800 });
    expect(geometry.output.width / geometry.output.height).toBe(1);
  });

  it("un logo large 1200 × 300 est plafonné à 1024 px, proportions intactes, aucun pixel rogné", () => {
    const geometry = catalogueGeometry("none", 1200, 300);
    expect(geometry.source).toEqual({ x: 0, y: 0, width: 1200, height: 300 });
    expect(geometry.output).toEqual({ width: LOGO_MAX_EDGE, height: 256 });
  });

  it("un visuel de parfum est recadré au centre en portrait 1024 × 1536", () => {
    const wide = portraitCover(3000, 3000);
    expect(wide.output).toEqual(PERFUME_FRAME);
    expect(wide.source).toEqual({ x: 500, y: 0, width: 2000, height: 3000 });
    const tall = portraitCover(1000, 2000);
    expect(tall.source).toEqual({ x: 0, y: 250, width: 1000, height: 1500 });
  });

  it("une planche story 1080 × 1920 n'est jamais recadrée ; 2160 × 3840 est ramenée à 1080 × 1920", () => {
    expect(fitWithin(1080, 1920, 1920).output).toEqual({ width: 1080, height: 1920 });
    const big = fitWithin(2160, 3840, 1920);
    expect(big.source).toEqual({ x: 0, y: 0, width: 2160, height: 3840 });
    expect(big.output).toEqual({ width: 1080, height: 1920 });
  });
});

describe("conversion", () => {
  it("logo 800 × 800 converti : fichier WebP de 800 × 800, image libérée", async () => {
    const { codec, drawn, images } = fakeCodec({ width: 800, height: 800 });
    const prepared = await convertCatalogueImage(file("Logo Dior.png", "image/png"), "none", codec);
    expect(prepared.width / prepared.height).toBe(1);
    expect([prepared.width, prepared.height]).toEqual([800, 800]);
    expect(prepared.file.type).toBe("image/webp");
    expect(prepared.file.name).toBe("Logo Dior.webp");
    expect(drawn[0]?.source).toEqual({ x: 0, y: 0, width: 800, height: 800 });
    expect(images.every((image) => image.closed)).toBe(true);
  });

  it("visuel de parfum : 1024 × 1536", async () => {
    const { codec } = fakeCodec({ width: 4032, height: 3024 });
    const prepared = await convertCatalogueImage(file("IMG_0001.HEIC", ""), "portrait", codec);
    expect([prepared.width, prepared.height]).toEqual([1024, 1536]);
  });

  it("HEIC accepté même sans type MIME ; un PDF est refusé avant tout décodage", () => {
    expect(isImageFile({ name: "IMG_0001.HEIC", type: "" })).toBe(true);
    expect(isImageFile({ name: "photo.heif", type: "application/octet-stream" })).toBe(true);
    expect(isImageFile({ name: "facture.pdf", type: "application/pdf" })).toBe(false);
  });

  it("story : format illisible et fichier de plus de 12 Mo refusés avec une raison courte", async () => {
    await expect(prepareStoryImage(file("planche.heic", "image/heic"), fakeCodec("illisible").codec)).rejects.toThrow(
      IMAGE_REFUSALS.unreadable,
    );
    const heavy = file("planche.png", "image/png", 12 * 1024 * 1024 + 1);
    const { codec, images } = fakeCodec({ width: 1080, height: 1920 });
    await expect(prepareStoryImage(heavy, codec)).rejects.toThrow(IMAGE_REFUSALS.tooHeavy);
    expect(images).toEqual([]);
  });

  it("appareil sans encodeur WebP (Safari) : repli nommé et typé honnêtement, PNG au catalogue, JPEG en story", async () => {
    const logo = await convertCatalogueImage(file("Logo.png", "image/png"), "none", fakeCodec({ width: 800, height: 800 }, ["image/png", "image/jpeg"]).codec);
    expect([logo.file.name, logo.file.type, logo.width, logo.height]).toEqual(["Logo.png", "image/png", 800, 800]);
    const story = await prepareStoryImage(file("planche.heic", "image/heic"), fakeCodec({ width: 1080, height: 1920 }, ["image/png", "image/jpeg"]).codec);
    expect([story.file.name, story.file.type]).toEqual(["planche.jpg", "image/jpeg"]);
  });

  it("story 9:16 : dimensions conservées", async () => {
    const { codec, drawn } = fakeCodec({ width: 1080, height: 1920 });
    const prepared = await prepareStoryImage(file("sauvage-story.jpg", "image/jpeg"), codec);
    expect([prepared.width, prepared.height]).toEqual([1080, 1920]);
    expect(drawn[0]?.source).toEqual({ x: 0, y: 0, width: 1080, height: 1920 });
  });
});
