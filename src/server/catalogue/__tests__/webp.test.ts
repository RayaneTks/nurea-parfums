import { crc32, deflateSync } from "node:zlib";
import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { IMAGE_TOO_LARGE_MESSAGE, IMAGE_UNREADABLE_MESSAGE } from "@/contracts/catalogue";

/**
 * Conversion WebP côté serveur (04 §12 ; décision du 17/09/2026) : logo jamais recadré et transparent,
 * visuel de parfum en portrait 1024 × 1536, planche story plafonnée à 1920 px sans recadrage ; orientation
 * EXIF appliquée puis métadonnées retirées ; profil Display P3 converti en sRGB ; formats refusés ; temps
 * de conversion d'une photo de 12 Mpx. Images fabriquées à la volée (aucun binaire versionné).
 */

vi.mock("server-only", () => ({}));

let webp: typeof import("../webp");

beforeAll(async () => {
  webp = await import("../webp");
});

type Rgb = [number, number, number];

const RED: Rgb = [220, 20, 20];
const GREY: Rgb = [128, 128, 128];

/** Pixels bruts RVB(A) d'une image : `fill(x, y)` rend la couleur de chaque pixel. */
function raw(width: number, height: number, channels: 3 | 4, fill: (x: number, y: number) => number[]) {
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = fill(x, y);
      for (let c = 0; c < channels; c += 1) data[(y * width + x) * channels + c] = color[c] ?? 255;
    }
  }
  return { data, info: { raw: { width, height, channels } } };
}

async function pixels(image: Buffer) {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  return (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x + 1) * info.channels)];
}

const isRed = ([r, g, b]: number[]) => (r ?? 0) > 170 && (g ?? 255) < 90 && (b ?? 255) < 90;

describe("un traitement par usage", () => {
  it("logo 800 × 800 transparent ⇒ WebP 800 × 800 avec alpha : ni recadré, ni agrandi, transparence gardée", async () => {
    const { data, info } = raw(800, 800, 4, (x, y) => (x >= 200 && x < 600 && y >= 200 && y < 600 ? [20, 20, 20, 255] : [0, 0, 0, 0]));
    const png = await sharp(data, info).png().toBuffer();
    const out = await webp.toWebp(png, "logo");
    expect([out.width, out.height, out.hasAlpha]).toEqual([800, 800, true]);
    const meta = await sharp(out.data).metadata();
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(["webp", 800, 800, true]);
    const at = await pixels(out.data);
    expect(at(10, 10)[3]).toBe(0);
    expect(at(400, 400)[3]).toBe(255);
    expect(out.bytes).toBe(out.data.length);
  });

  it("logo large 1200 × 300 ⇒ 1024 × 256 : plafonné, proportions intactes ; un petit logo n'est jamais agrandi", async () => {
    const grey = raw(1200, 300, 3, () => GREY);
    const wide = await sharp(grey.data, grey.info).png().toBuffer();
    expect(await webp.toWebp(wide, "logo")).toMatchObject({ width: 1024, height: 256 });
    const small = await sharp({ create: { width: 120, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    expect(await webp.toWebp(small, "logo")).toMatchObject({ width: 120, height: 40 });
  });

  it("photo 4000 × 3000 orientée EXIF 6 ⇒ tournée d'un quart de tour horaire, puis portrait ; EXIF retiré", async () => {
    // Coin haut-gauche rouge dans les pixels STOCKÉS : affiché (rotation horaire), il est en haut à droite.
    const { data, info } = raw(4000, 3000, 3, (x, y) => (x < 2000 && y < 1500 ? RED : GREY));
    const photo = await sharp(data, info).jpeg({ quality: 90 }).withMetadata({ orientation: 6 }).toBuffer();
    expect((await sharp(photo).metadata()).orientation).toBe(6);

    const portrait = await webp.toWebp(photo, "parfum");
    expect([portrait.width, portrait.height]).toEqual([1024, 1536]);
    const inPortrait = await pixels(portrait.data);
    expect(isRed(inPortrait(768, 384)), "haut droite rouge").toBe(true);
    expect(isRed(inPortrait(256, 384)), "haut gauche gris").toBe(false);
    expect(isRed(inPortrait(768, 1152)), "bas droite gris").toBe(false);

    const story = await webp.toWebp(photo, "story");
    expect([story.width, story.height]).toEqual([1440, 1920]);
    const inStory = await pixels(story.data);
    expect(isRed(inStory(1080, 480))).toBe(true);
    expect(isRed(inStory(360, 480))).toBe(false);

    for (const out of [portrait, story]) {
      const meta = await sharp(out.data).metadata();
      expect([meta.format, meta.orientation, meta.exif, meta.icc, meta.space]).toEqual(["webp", undefined, undefined, undefined, "srgb"]);
    }
  });

  it("visuel de parfum : recadrage « cover » centré en 1024 × 1536, même depuis une petite image", async () => {
    const square = await sharp({ create: { width: 600, height: 600, channels: 3, background: "#7b0b1d" } }).jpeg().toBuffer();
    expect(await webp.toWebp(square, "parfum")).toMatchObject({ width: 1024, height: 1536, hasAlpha: false });
  });

  it("story 1080 × 1920 ⇒ WebP 1080 × 1920 non recadré ; 2160 × 3840 ⇒ 1080 × 1920, bords gardés", async () => {
    // Bandeaux rouges en haut et en bas : un recadrage les perdrait.
    const band = (w: number, h: number) => raw(w, h, 3, (_x, y) => (y < h * 0.05 || y >= h * 0.95 ? RED : GREY));
    const exact = band(1080, 1920);
    const story = await webp.toWebp(await sharp(exact.data, exact.info).png().toBuffer(), "story");
    expect([story.width, story.height]).toEqual([1080, 1920]);
    const at = await pixels(story.data);
    expect([isRed(at(540, 20)), isRed(at(540, 1900)), isRed(at(540, 960))]).toEqual([true, true, false]);

    const big = band(2160, 3840);
    const reduced = await webp.toWebp(await sharp(big.data, big.info).jpeg().toBuffer(), "story");
    expect([reduced.width, reduced.height]).toEqual([1080, 1920]);
    const atReduced = await pixels(reduced.data);
    expect([isRed(atReduced(540, 20)), isRed(atReduced(540, 1900))]).toEqual([true, true]);
  });
});

describe("couleur, formats, idempotence", () => {
  it("profil Display P3 embarqué (iPhone) : converti en sRGB, aucun profil dans le WebP", async () => {
    const swatch = raw(16, 16, 3, () => [200, 100, 50]);
    const plain = await sharp(swatch.data, swatch.info).png().toBuffer();
    const p3Canvas = await sharp(plain).withIccProfile("p3").png().toBuffer();
    // Mêmes valeurs 200/100/50 étiquetées P3 (composées sans conversion, profil gardé).
    const taggedP3 = await sharp(p3Canvas).composite([{ input: plain }]).png().keepIccProfile().toBuffer();
    expect((await sharp(taggedP3).metadata()).icc).toBeDefined();

    const out = await webp.toWebp(taggedP3, "logo");
    const meta = await sharp(out.data).metadata();
    expect([meta.icc, meta.space]).toEqual([undefined, "srgb"]);
    const [r, g, b] = (await pixels(out.data))(8, 8);
    // P3 (200, 100, 50) ≈ sRGB (215, 93, 32) : un profil ignoré aurait laissé 200/100/50.
    expect(Math.abs((r ?? 0) - 215)).toBeLessThanOrEqual(4);
    expect(Math.abs((g ?? 0) - 93)).toBeLessThanOrEqual(4);
    expect(Math.abs((b ?? 0) - 32)).toBeLessThanOrEqual(4);
  });

  it("GIF statique et WebP acceptés ; la même entrée rend les mêmes octets (renvoi idempotent)", async () => {
    const gif = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#204080" } }).gif().toBuffer();
    const fromGif = await webp.toWebp(gif, "story");
    expect([fromGif.width, fromGif.height]).toEqual([300, 200]);
    const again = await webp.toWebp(gif, "story");
    expect(again.data.equals(fromGif.data)).toBe(true);
    expect(await webp.toWebp(fromGif.data, "parfum")).toMatchObject({ width: 1024, height: 1536 });
  });

  it("HEIC : le sharp précompilé de ce projet ne décode pas le HEVC ⇒ « format illisible » (l'appareil envoie un JPEG)", async () => {
    // Si ce test échoue un jour parce que .heic est lu, le repli JPEG de image-convert.ts peut disparaître.
    expect(sharp.format.heif.input.fileSuffix).not.toContain(".heic");
    await expect(sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } }).heif({ compression: "hevc" }).toBuffer()).rejects.toThrow();
    const heicHeader = Buffer.concat([Buffer.from("0000001866747970686569630000000068656963", "hex"), Buffer.alloc(256)]);
    await expect(webp.toWebp(heicHeader, "story")).rejects.toMatchObject({ code: "VALIDATION", message: IMAGE_UNREADABLE_MESSAGE, field: "source" });
  });

  it("refusés « format illisible » : texte, SVG, TIFF, octets tronqués", async () => {
    const tiff = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).tiff().toBuffer();
    const jpeg = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#123456" } }).jpeg().toBuffer();
    for (const input of [
      Buffer.from("pas une image du tout"),
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'),
      tiff,
      jpeg.subarray(0, 40),
    ]) {
      await expect(webp.toWebp(input, "logo")).rejects.toMatchObject({ code: "VALIDATION", message: IMAGE_UNREADABLE_MESSAGE });
    }
  });

  it("plus de 100 millions de pixels annoncés ⇒ refus avant tout décodage", async () => {
    const chunk = (type: string, body: Buffer) => {
      const head = Buffer.alloc(4);
      head.writeUInt32BE(body.length);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), body])));
      return Buffer.concat([head, Buffer.from(type), body, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(20_000, 0);
    ihdr.writeUInt32BE(20_000, 4);
    ihdr.set([8, 2, 0, 0, 0], 8);
    // Un PNG de 20 000 × 20 000 annoncés, dont les données ne décompresseraient jamais jusque-là.
    const bomb = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(Buffer.alloc(1000))),
      chunk("IEND", Buffer.alloc(0)),
    ]);
    await expect(webp.toWebp(bomb, "story")).rejects.toMatchObject({ code: "VALIDATION", message: IMAGE_TOO_LARGE_MESSAGE });
  });
});

describe("temps de conversion", () => {
  /*
   * Le seuil est large À DESSEIN. Sur une machine au repos la conversion tient en ~0,2 à 1,2 s (les mesures
   * partent dans la console à chaque exécution) ; sous charge — plusieurs suites en parallèle, ou un agent de
   * construction — elle dépasse deux secondes sans qu'aucune régression n'existe. Un test qui échoue au gré de
   * la charge finit ignoré : celui-ci ne mord que sur un changement d'ordre de grandeur, la vraie régression.
   */
  it("photo synthétique de 12 Mpx (4000 × 3000, JPEG) : aucune conversion ne dérive en ordre de grandeur", async () => {
    let seed = 7;
    const noise = () => ((seed = (seed * 1_103_515_245 + 12_345) & 0x7fffffff) / 0x7fffffff - 0.5) * 40;
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
    const { data, info } = raw(4000, 3000, 3, (x, y) => {
      const n = noise();
      return [clamp((x / 4000) * 255 + n), clamp((y / 3000) * 255 + n), clamp(128 + Math.sin(x / 50) * 60 + n)];
    });
    const photo = await sharp(data, info).jpeg({ quality: 90 }).withMetadata({ orientation: 6 }).toBuffer();

    const timings: Record<string, number> = {};
    for (const usage of ["parfum", "logo", "story"] as const) {
      const started = performance.now();
      await webp.toWebp(photo, usage);
      timings[usage] = Math.round(performance.now() - started);
    }
    console.info(`Conversion WebP d'une photo de 12 Mpx (${Math.round(photo.length / 1024)} Ko) :`, timings);
    for (const [usage, ms] of Object.entries(timings)) expect(ms, usage).toBeLessThan(8_000);
  });
});
