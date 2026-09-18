import { describe, expect, it } from "vitest";
import {
  IMAGE_TOO_HEAVY_MESSAGE,
  IMAGE_UNREADABLE_MESSAGE,
  MAX_IMAGE_BYTES,
  UPLOAD_PATH_MESSAGE,
} from "@/contracts/catalogue";
import {
  HEIC_MAX_EDGE,
  IMAGE_REFUSALS,
  fitWithin,
  isHeic,
  isImageFile,
  prepareUpload,
  refusalReason,
  uploadExtension,
  type DecodedImage,
  type ImageCodec,
  type Size,
} from "../image-convert";

/**
 * Ce qui reste à l'appareil (04 §12, décision du 17/09/2026) : la conversion WebP est faite par le serveur.
 * L'appareil refuse tôt (pas une image, plus de 12 Mo) et ne convertit que le HEIC, en JPEG entier (le
 * `sharp` du serveur ne décode pas le HEVC). Codec double : Node n'a ni canevas ni `createImageBitmap`.
 */

type FakeImage = DecodedImage & { closed: boolean };

function fakeCodec(size: Size | "illisible", jpeg: "image/jpeg" | "image/png" | null = "image/jpeg") {
  const drawn: Size[] = [];
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
    async encodeJpeg(_image, output) {
      drawn.push(output);
      return jpeg === null ? null : new Blob([new Uint8Array(16)], { type: jpeg });
    },
  };
  return { codec, drawn, images };
}

const file = (name: string, type: string, bytes = 1024) => new File([new Uint8Array(bytes)], name, { type });

describe("préparation de l'original", () => {
  it("JPEG, PNG, WebP, GIF : envoyés tels quels, sans décodage ni recadrage (le serveur convertit)", async () => {
    for (const original of [file("IMG_0001.JPG", "image/jpeg"), file("Logo Dior.png", "image/png"), file("planche.webp", "image/webp"), file("a.gif", "image/gif")]) {
      const { codec, images } = fakeCodec({ width: 800, height: 800 });
      expect(await prepareUpload(original, codec)).toBe(original);
      expect(images).toEqual([]);
    }
  });

  it("HEIC (même sans type MIME) : JPEG de l'image entière, grand côté plafonné à 4096 px, image libérée", async () => {
    const { codec, drawn, images } = fakeCodec({ width: 8064, height: 6048 });
    const prepared = await prepareUpload(file("IMG_0001.HEIC", ""), codec);
    expect([prepared.name, prepared.type]).toEqual(["IMG_0001.jpg", "image/jpeg"]);
    expect(drawn).toEqual([{ width: HEIC_MAX_EDGE, height: 3072 }]);
    expect(images.every((image) => image.closed)).toBe(true);

    const small = fakeCodec({ width: 1440, height: 2560 });
    await prepareUpload(file("planche.heif", "image/heif"), small.codec);
    expect(small.drawn).toEqual([{ width: 1440, height: 2560 }]);
  });

  it("refus avant tout envoi, avec une raison courte : pas une image, plus de 12 Mo, HEIC illisible ou inconvertible", async () => {
    await expect(prepareUpload(file("facture.pdf", "application/pdf"), fakeCodec({ width: 1, height: 1 }).codec)).rejects.toThrow(
      IMAGE_REFUSALS.notAnImage,
    );
    const heavy = fakeCodec({ width: 1080, height: 1920 });
    await expect(prepareUpload(file("planche.png", "image/png", MAX_IMAGE_BYTES + 1), heavy.codec)).rejects.toThrow(IMAGE_REFUSALS.tooHeavy);
    expect(heavy.images).toEqual([]);
    await expect(prepareUpload(file("capture.heic", "image/heic"), fakeCodec("illisible").codec)).rejects.toThrow(IMAGE_REFUSALS.unreadable);
    const noJpeg = fakeCodec({ width: 800, height: 600 }, "image/png");
    await expect(prepareUpload(file("capture.heic", "image/heic"), noJpeg.codec)).rejects.toThrow(IMAGE_REFUSALS.conversion);
    expect(noJpeg.images.every((image) => image.closed)).toBe(true);
  });

  it("reconnaît une image et un HEIC par le type ou par l'extension", () => {
    expect(isImageFile({ name: "IMG_0001.HEIC", type: "" })).toBe(true);
    expect(isImageFile({ name: "photo.heif", type: "application/octet-stream" })).toBe(true);
    expect(isImageFile({ name: "facture.pdf", type: "application/pdf" })).toBe(false);
    expect(isHeic({ name: "photo", type: "image/heic" })).toBe(true);
    expect(isHeic({ name: "photo.jpg", type: "image/jpeg" })).toBe(false);
  });

  it("extension de l'original : celle du nom si acceptée, sinon celle du type", () => {
    expect(uploadExtension({ name: "IMG_0001.JPEG", type: "image/jpeg" })).toBe("jpeg");
    expect(uploadExtension({ name: "photo", type: "image/png" })).toBe("png");
    expect(uploadExtension({ name: "capture.bmp.webp", type: "" })).toBe("webp");
    expect(uploadExtension({ name: "scan.tiff", type: "image/tiff" })).toBe("tiff");
  });

  it("géométrie : plafond sans recadrage ni agrandissement", () => {
    expect(fitWithin(1080, 1920, 4096)).toEqual({ width: 1080, height: 1920 });
    expect(fitWithin(6048, 8064, 4096)).toEqual({ width: 3072, height: 4096 });
  });
});

describe("raison d'un refus du serveur", () => {
  it("courte quand elle est connue, sinon le message (du champ source d'abord)", () => {
    expect(refusalReason({ message: IMAGE_UNREADABLE_MESSAGE, fields: { source: IMAGE_UNREADABLE_MESSAGE } })).toBe(IMAGE_REFUSALS.unreadable);
    expect(refusalReason({ message: IMAGE_TOO_HEAVY_MESSAGE })).toBe(IMAGE_REFUSALS.tooHeavy);
    expect(refusalReason({ message: "Vérifie les champs signalés.", fields: { source: UPLOAD_PATH_MESSAGE } })).toBe(UPLOAD_PATH_MESSAGE);
    expect(refusalReason({ message: "Maximum 24 visuels par parfum." })).toBe("Maximum 24 visuels par parfum.");
  });
});
