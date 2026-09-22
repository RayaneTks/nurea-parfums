import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_NOT_RECEIVED_MESSAGE,
  IMAGE_TOO_HEAVY_MESSAGE,
  IMAGE_UNREADABLE_MESSAGE,
  MAX_MEDIA_MESSAGE,
  STORY_PATH_MESSAGE,
  UPLOAD_PATH_MESSAGE,
} from "@/contracts/catalogue";
import {
  FOREIGN,
  INJECTED,
  OWNED,
  catalogueImage,
  expectError,
  expectOk,
  freshStart,
  isWebp,
  loadCatalogueServer,
  sendOriginal,
  stamp,
  storageFake,
  storyPath,
  storyUploadPath,
  type CatalogueServer,
} from "./support/catalogue";

/**
 * Visuels story (`PerfumeMedia`, 04 §12, §16.3 ; 07 J11) et conversion WebP côté serveur (décision du
 * 17/09/2026) : l'original envoyé sous `tmp/stories/<parfum>/` est vérifié strictement, converti en WebP
 * (jamais recadré), écrit à son chemin définitif, rangé (URL recalculée, dimensions lues, rang calculé sous
 * dépôts concurrents, 24 au plus), PUIS supprimé ; renvoyer la même demande ne crée ni second objet ni
 * seconde ligne. Retrait qui supprime l'objet APRÈS le commit et jamais sur une transaction annulée,
 * suppression du parfum qui lit les chemins avant le DELETE. Stockage Supabase simulé.
 */

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet-essai-j11.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-de-service-fictive";
  process.env.SUPABASE_STORAGE_BUCKET = "catalog";
});
const cookieJar = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  updateTag: () => undefined,
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));
vi.mock("@supabase/supabase-js", async () => (await import("./support/catalogue")).fakeSupabaseModule());

let server: CatalogueServer;

beforeAll(async () => {
  server = await loadCatalogueServer();
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

type MediaRow = { id: string; perfumeId: number; path: string; url: string; label: string | null; sortOrder: number };

const mediaRows = (perfumeId?: number) =>
  perfumeId === undefined
    ? server.prisma.$queryRaw<MediaRow[]>`SELECT id, "perfumeId", path, url, label, "sortOrder" FROM "PerfumeMedia" ORDER BY "sortOrder", id`
    : server.prisma.$queryRaw<MediaRow[]>`
        SELECT id, "perfumeId", path, url, label, "sortOrder" FROM "PerfumeMedia" WHERE "perfumeId" = ${perfumeId} ORDER BY "sortOrder", id`;

async function perfume(name = "Sauvage", image: string = catalogueImage()) {
  const brand = await server.prisma.brand.findFirst({ where: { name: "Dior" } });
  const brandRef = brand ? { kind: "existing" as const, brandId: brand.id } : { kind: "new" as const, name: "Dior" };
  return expectOk(await server.actions.createPerfumeAction({ brand: brandRef, name, image }));
}

/** Déposer comme l'écran : original envoyé sous tmp/, puis converti et rangé. */
async function deposit(perfumeId: number, overrides: { source?: string; label?: string | null; bytes?: Uint8Array } = {}) {
  const source = overrides.source ?? (await sendOriginal(server, { usage: "story", perfumeId }, overrides.bytes));
  return server.actions.addPerfumeMediaAction({ perfumeId, source, label: overrides.label });
}

describe("dépôt : l'original devient un WebP, chemin et URL décidés par le serveur", () => {
  it("original PNG 1080 × 1920 ⇒ WebP 1080 × 1920 à stories/<parfum>/<même horodatage>.webp, rangé, PUIS original supprimé", async () => {
    const sauvage = await perfume();
    const planche = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: "#7b0b1d" } }).png().toBuffer();
    const source = await sendOriginal(server, { usage: "story", perfumeId: sauvage.id, extension: "PNG" }, planche);
    const stampOf = /(\d{13}-[0-9a-f]{8})\.png$/.exec(source)?.[1];
    expect(source).toMatch(new RegExp(`^tmp/stories/${sauvage.id}/\\d{13}-[0-9a-f]{8}\\.png$`));

    const seenAtUploadRemoval: { rows: number; webp: boolean }[] = [];
    storageFake.onRemoveUpload = async () => {
      // Autre connexion : la ligne est déjà validée, et le WebP déjà écrit, quand l'original part.
      seenAtUploadRemoval.push({ rows: (await mediaRows(sauvage.id)).length, webp: isWebp(storageFake.objects.get(`stories/${sauvage.id}/${stampOf}.webp`)) });
    };
    const item = expectOk(await server.actions.addPerfumeMediaAction({ perfumeId: sauvage.id, source, label: "Story 9:16" }));

    const path = `stories/${sauvage.id}/${stampOf}.webp`;
    expect(item).toMatchObject({ url: `${OWNED}${path}`, label: "Story 9:16", width: 1080, height: 1920, sortOrder: 0 });
    const stored = storageFake.objects.get(path);
    expect(isWebp(stored)).toBe(true);
    expect(item.bytes).toBe(stored?.length);
    expect(await sharp(stored).metadata()).toMatchObject({ format: "webp", width: 1080, height: 1920 });
    expect(storageFake.uploads).toEqual([{ path, contentType: "image/webp", upsert: true }]);
    expect(seenAtUploadRemoval).toEqual([{ rows: 1, webp: true }]);
    expect(storageFake.removedUploads).toEqual([source]);
    expect(storageFake.keys()).toEqual([path]);
    expect((await mediaRows())[0]).toMatchObject({ path, url: `${OWNED}${path}` });
  });

  it("source hors tmp/stories/<parfum>/, d'un autre parfum, définitive ou avec `..` ⇒ VALIDATION : rien de lu, rien d'écrit", async () => {
    const sauvage = await perfume();
    const bleu = await perfume("Bleu");
    const planted = await sendOriginal(server, { usage: "parfum" });
    storageFake.downloads.length = 0;
    for (const source of [
      planted,
      `tmp/brands/${stamp()}.png`,
      storyUploadPath(bleu.id),
      storyPath(sauvage.id),
      `tmp/stories/${sauvage.id}/../${bleu.id}/${stamp()}.png`,
      `tmp/stories/${sauvage.id}/..%2f${stamp()}.png`,
      `tmp/stories/${sauvage.id}/${stamp()}.svg`,
      `${OWNED}${storyUploadPath(sauvage.id)}`,
    ]) {
      const error = expectError(await deposit(sauvage.id, { source }), "VALIDATION");
      expect(error.fields, source).toEqual({ source: STORY_PATH_MESSAGE });
    }
    expect(storageFake.downloads).toEqual([]);
    expect(storageFake.uploads).toEqual([]);
    expect(storageFake.removedUploads).toEqual([]);
    expect(storageFake.objects.has(planted)).toBe(true);
    // Le writer revérifie : un appelant qui contournerait le contrat est refusé de la même façon.
    await expect(
      server.inTransaction((tx) =>
        server.media.addMedia(tx, {
          perfumeId: sauvage.id,
          path: `stories/${sauvage.id}/../../perfumes/${stamp()}.webp`,
          url: `${OWNED}perfumes/x.webp`,
          label: null,
          width: 1,
          height: 1,
          bytes: 1,
        }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION", message: STORY_PATH_MESSAGE });
    expect(await mediaRows()).toEqual([]);
  });

  it("URL, dimensions et poids viennent du serveur : ceux qu'on enverrait ne sont jamais crus", async () => {
    const sauvage = await perfume();
    const source = await sendOriginal(server, { usage: "story", perfumeId: sauvage.id });
    const input = { perfumeId: sauvage.id, source, width: 9999, height: 9999, bytes: 1, path: "perfumes/piege.webp", url: "https://ailleurs.example/piege.webp" };
    const item = expectOk(await server.actions.addPerfumeMediaAction(input as Parameters<typeof server.actions.addPerfumeMediaAction>[0]));
    const path = `stories/${sauvage.id}/${/(\d{13}-[0-9a-f]{8})/.exec(source)?.[1]}.webp`;
    expect(item).toMatchObject({ url: `${OWNED}${path}`, width: 90, height: 160 });
    expect(item.bytes).toBe(storageFake.objects.get(path)?.length);
    expect((await mediaRows())[0]).toMatchObject({ path, url: `${OWNED}${path}` });
  });

  it("parfum absent ⇒ NOT_FOUND sans conversion ; même demande renvoyée (double tap, puis après coupure) ⇒ un objet, une ligne", async () => {
    const absent = storyUploadPath(424242);
    storageFake.objects.set(absent, new Uint8Array([1, 2, 3]));
    expectError(await deposit(424242, { source: absent }), "NOT_FOUND");
    expect(storageFake.downloads).toEqual([]);
    expect(storageFake.removedUploads).toEqual([absent]);

    const sauvage = await perfume();
    const source = await sendOriginal(server, { usage: "story", perfumeId: sauvage.id });
    const [first, second] = await Promise.all([deposit(sauvage.id, { source }), deposit(sauvage.id, { source })]);
    expect(expectOk(first).id).toBe(expectOk(second).id);
    // Réponse perdue, « Réessayer » : l'original est déjà supprimé, le visuel rangé est rendu tel quel.
    expect(storageFake.objects.has(source)).toBe(false);
    expect(expectOk(await deposit(sauvage.id, { source })).id).toBe(expectOk(first).id);
    expect(await mediaRows()).toHaveLength(1);
    expect(storageFake.keys(`stories/${sauvage.id}/`)).toHaveLength(1);
    expect(storageFake.keys("tmp/")).toEqual([]);
  });

  it("WebP écrit mais ligne jamais rangée (panne après l'écriture), original supprimé : le renvoi range le WebP en place", async () => {
    const sauvage = await perfume();
    const source = await sendOriginal(server, { usage: "story", perfumeId: sauvage.id });
    const converted = await server.storage.convertUpload(source, "story");
    await server.storage.removeUpload(source);
    const uploads = storageFake.uploads.length;
    const item = expectOk(await deposit(sauvage.id, { source }));
    expect(item).toMatchObject({ url: converted.url, width: 90, height: 160, bytes: converted.bytes });
    expect(storageFake.uploads).toHaveLength(uploads);
  });

  it("original illisible, de plus de 12 Mo ou jamais arrivé ⇒ VALIDATION sous source, rien de rangé, original supprimé", async () => {
    const sauvage = await perfume();
    const cases = [
      { bytes: new TextEncoder().encode("pas une image du tout"), message: IMAGE_UNREADABLE_MESSAGE },
      { bytes: new Uint8Array(12 * 1024 * 1024 + 1), message: IMAGE_TOO_HEAVY_MESSAGE },
    ];
    for (const { bytes, message } of cases) {
      const source = await sendOriginal(server, { usage: "story", perfumeId: sauvage.id }, bytes);
      const error = expectError(await deposit(sauvage.id, { source }), "VALIDATION");
      expect(error.fields).toEqual({ source: message });
      expect(storageFake.objects.has(source)).toBe(false);
    }
    const neverSent = storyUploadPath(sauvage.id, "heic");
    expect(expectError(await deposit(sauvage.id, { source: neverSent }), "VALIDATION").fields).toEqual({ source: IMAGE_NOT_RECEIVED_MESSAGE });
    expect(await mediaRows()).toEqual([]);
    expect(storageFake.uploads).toEqual([]);
  });

  it("rang calculé dans la transaction : six dépôts simultanés prennent six rangs distincts", async () => {
    const sauvage = await perfume();
    const sources = await Promise.all(Array.from({ length: 6 }, () => sendOriginal(server, { usage: "story", perfumeId: sauvage.id })));
    const results = await Promise.all(sources.map((source) => deposit(sauvage.id, { source })));
    expect(results.every((r) => r.ok)).toBe(true);
    expect((await mediaRows(sauvage.id)).map((m) => m.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(storageFake.keys(`stories/${sauvage.id}/`)).toHaveLength(6);
  });

  it("25e visuel ⇒ CONFLICT « Maximum 24 visuels par parfum… » avant toute conversion, rien d'écrit", async () => {
    const sauvage = await perfume();
    for (let i = 0; i < 24; i += 1) expectOk(await deposit(sauvage.id));
    const uploads = storageFake.uploads.length;
    expect(expectError(await deposit(sauvage.id), "CONFLICT").message).toBe(MAX_MEDIA_MESSAGE);
    expect(await mediaRows(sauvage.id)).toHaveLength(24);
    expect(storageFake.uploads).toHaveLength(uploads);
    expect(storageFake.keys("tmp/")).toEqual([]);
    // Le plafond est par parfum.
    expectOk(await deposit((await perfume("Bleu")).id));
  });

  it("un visuel story ne rend jamais visible un parfum sans visuel de catalogue (03 §6.1)", async () => {
    const sauvage = await perfume("Sauvage", "");
    expectOk(await deposit(sauvage.id));
    expect((await server.prisma.perfume.findUniqueOrThrow({ where: { id: sauvage.id } })).status).toBe("DRAFT");
    expect(expectError(await server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "PUBLISHED" }), "CONFLICT").message).toBe(
      "Ajoute un visuel pour publier ce parfum.",
    );
  });
});

describe("libellé et ordre de la galerie", () => {
  it("libellé posé puis effacé ; visuel d'un autre parfum ⇒ NOT_FOUND", async () => {
    const sauvage = await perfume();
    const bleu = await perfume("Bleu");
    const item = expectOk(await deposit(sauvage.id, { label: "  Story 9:16 " }));
    expect(item.label).toBe("Story 9:16");
    expect(expectOk(await server.actions.setPerfumeMediaLabelAction({ perfumeId: sauvage.id, mediaId: item.id, label: "Fond clair" })).label).toBe(
      "Fond clair",
    );
    expect(expectOk(await server.actions.setPerfumeMediaLabelAction({ perfumeId: sauvage.id, mediaId: item.id, label: "" })).label).toBeNull();
    expectError(await server.actions.setPerfumeMediaLabelAction({ perfumeId: bleu.id, mediaId: item.id, label: "x" }), "NOT_FOUND");
  });

  it("réordonner : identifiants inconnus ignorés, visuels omis rangés après dans leur ordre, rangs recompactés", async () => {
    const sauvage = await perfume();
    const bleu = await perfume("Bleu");
    const [a, b, c, d] = [
      expectOk(await deposit(sauvage.id)),
      expectOk(await deposit(sauvage.id)),
      expectOk(await deposit(sauvage.id)),
      expectOk(await deposit(sauvage.id)),
    ];
    const foreign = expectOk(await deposit(bleu.id));
    const ordered = expectOk(
      await server.actions.reorderPerfumeMediaAction({
        perfumeId: sauvage.id,
        orderedIds: [c.id, globalThis.crypto.randomUUID(), foreign.id, a.id, c.id],
      }),
    );
    expect(ordered.map((m) => [m.id, m.sortOrder])).toEqual([
      [c.id, 0],
      [a.id, 1],
      [b.id, 2],
      [d.id, 3],
    ]);
    expect((await mediaRows(bleu.id)).map((m) => m.sortOrder)).toEqual([0]);
  });
});

describe("retrait : l'objet part APRÈS le commit, jamais sur une transaction annulée", () => {
  it("ligne supprimée, puis objet supprimé à son chemin ; déjà retiré ⇒ succès sans suppression", async () => {
    const sauvage = await perfume();
    const item = expectOk(await deposit(sauvage.id));
    const seen: number[] = [];
    storageFake.onRemove = async () => {
      seen.push((await mediaRows(sauvage.id)).length); // autre connexion : le DELETE est déjà validé
    };
    expect(expectOk(await server.actions.removePerfumeMediaAction({ perfumeId: sauvage.id, mediaId: item.id }))).toEqual({
      id: item.id,
      removed: true,
    });
    expect(seen).toEqual([0]);
    expect(storageFake.removed).toEqual([[item.url.slice(OWNED.length)]]);
    expect(storageFake.keys(`stories/${sauvage.id}/`)).toEqual([]);

    storageFake.removed.length = 0;
    expect(expectOk(await server.actions.removePerfumeMediaAction({ perfumeId: sauvage.id, mediaId: item.id }))).toEqual({
      id: item.id,
      removed: false,
    });
    expect(storageFake.removed).toEqual([]);
  });

  it("retrait dans une transaction annulée : aucune suppression d'objet appelée, la ligne reste", async () => {
    const sauvage = await perfume();
    const item = expectOk(await deposit(sauvage.id));
    storageFake.clients.length = 0; // le dépôt a parlé au stockage ; le retrait annulé, jamais
    await expect(
      server.storage.commitThenRemoveObjects(async (tx) => {
        const out = await server.media.removeMedia(tx, { perfumeId: sauvage.id, mediaId: item.id });
        expect(out).toEqual({ removed: true, url: item.url });
        throw new Error(INJECTED);
      }),
    ).rejects.toThrow(INJECTED);
    expect(storageFake.removed).toEqual([]);
    expect(storageFake.clients).toEqual([]);
    expect(await mediaRows(sauvage.id)).toHaveLength(1);
  });

  it("visuel repris de la production (URL d'un autre projet) : la ligne part, l'objet n'est jamais touché", async () => {
    const sauvage = await perfume();
    const path = `stories/${sauvage.id}/${stamp()}.webp`;
    await server.prisma.$executeRawUnsafe(
      `INSERT INTO "PerfumeMedia" (id, "perfumeId", path, url, width, height, bytes, "sortOrder")
       VALUES ('${globalThis.crypto.randomUUID()}', ${sauvage.id}, '${path}', '${FOREIGN}${path}', 1080, 1920, 1, 0)`,
    );
    const [row] = await mediaRows(sauvage.id);
    expect(expectOk(await server.actions.removePerfumeMediaAction({ perfumeId: sauvage.id, mediaId: row!.id })).removed).toBe(true);
    expect(storageFake.removed).toEqual([]);
  });

  it("suppression du parfum : URL des visuels lues avant le DELETE (cascade), objets supprimés après le commit", async () => {
    const image = catalogueImage();
    const sauvage = await perfume("Sauvage", image);
    const items = [expectOk(await deposit(sauvage.id)), expectOk(await deposit(sauvage.id))];
    const seen: number[] = [];
    storageFake.onRemove = async () => {
      seen.push(await server.prisma.perfume.count({ where: { id: sauvage.id } }));
    };
    expectOk(await server.actions.deletePerfumeAction({ id: sauvage.id }));
    expect(seen).toEqual([0]);
    expect(storageFake.removed.flat().sort()).toEqual([image, ...items.map((item) => item.url)].map((url) => url.slice(OWNED.length)).sort());
    expect(await mediaRows()).toEqual([]);
  });
});

describe("visuel de parfum et logo : convertImageAction (le formulaire enregistre l'URL rendue)", () => {
  const stampOf = (source: string) => /(\d{13}-[0-9a-f]{8})\.[a-z]+$/.exec(source)?.[1];

  it("photo 1200 × 1600 ⇒ WebP portrait 1024 × 1536 à perfumes/<même horodatage>.webp ; original supprimé ; publiable une fois l'URL enregistrée", async () => {
    const photo = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: "#7b0b1d" } }).jpeg().toBuffer();
    const source = await sendOriginal(server, { usage: "parfum", extension: "IMG_4021.JPG" }, photo);
    const image = expectOk(await server.actions.convertImageAction({ usage: "parfum", source }));
    const path = `perfumes/${stampOf(source)}.webp`;
    expect(image).toMatchObject({ url: `${OWNED}${path}`, width: 1024, height: 1536 });
    expect(await sharp(storageFake.objects.get(path)).metadata()).toMatchObject({ format: "webp", width: 1024, height: 1536 });
    expect(storageFake.keys()).toEqual([path]);
    expect(await server.prisma.perfume.count()).toBe(0); // rien d'écrit en base : c'est la fiche qui enregistre

    const brand = expectOk(await server.actions.createBrandAction({ name: "Dior" }));
    const sauvage = expectOk(await server.actions.createPerfumeAction({ brand: { kind: "existing", brandId: brand.id }, name: "Sauvage", image: image.url }));
    expect(sauvage.status).toBe("PUBLISHED");
  });

  it("logo 800 × 800 transparent ⇒ WebP 800 × 800 avec alpha, jamais recadré", async () => {
    const logo = await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: { create: { width: 400, height: 200, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } }, left: 200, top: 300 }])
      .png()
      .toBuffer();
    const source = await sendOriginal(server, { usage: "logo" }, logo);
    const image = expectOk(await server.actions.convertImageAction({ usage: "logo", source }));
    expect(image).toMatchObject({ url: `${OWNED}brands/${stampOf(source)}.webp`, width: 800, height: 800 });
    const meta = await sharp(storageFake.objects.get(`brands/${stampOf(source)}.webp`)).metadata();
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(["webp", 800, 800, true]);
  });

  it("même demande renvoyée (simultanée, puis après coupure) ⇒ même URL, un seul objet", async () => {
    const source = await sendOriginal(server, { usage: "logo" });
    const [first, second] = await Promise.all([
      server.actions.convertImageAction({ usage: "logo", source }),
      server.actions.convertImageAction({ usage: "logo", source }),
    ]);
    expect(expectOk(first).url).toBe(expectOk(second).url);
    const uploads = storageFake.uploads.length;
    expect(expectOk(await server.actions.convertImageAction({ usage: "logo", source })).url).toBe(expectOk(first).url);
    expect(storageFake.uploads).toHaveLength(uploads);
    expect(storageFake.keys()).toEqual([`brands/${stampOf(source)}.webp`]);
  });

  it("original d'un autre usage, définitif ou hors tmp/ ⇒ VALIDATION sous source, rien de lu ni de supprimé", async () => {
    const perfumeSource = await sendOriginal(server, { usage: "parfum" });
    const sauvage = await perfume();
    const storySource = await sendOriginal(server, { usage: "story", perfumeId: sauvage.id });
    storageFake.downloads.length = 0;
    for (const source of [perfumeSource, storySource, `brands/${stamp()}.webp`, `tmp/brands/../perfumes/${stamp()}.png`, `${OWNED}tmp/brands/${stamp()}.png`]) {
      const error = expectError(await server.actions.convertImageAction({ usage: "logo", source }), "VALIDATION");
      expect(error.fields, source).toEqual({ source: UPLOAD_PATH_MESSAGE });
    }
    expect(storageFake.downloads).toEqual([]);
    expect(storageFake.removedUploads).toEqual([]);
    expect(storageFake.keys("tmp/")).toEqual([perfumeSource, storySource].sort());
  });

  it("original illisible ⇒ « Format illisible… », aucun objet écrit, original supprimé", async () => {
    const source = await sendOriginal(server, { usage: "parfum", extension: "heic" }, new TextEncoder().encode("ftypheic, mais rien derrière"));
    expect(expectError(await server.actions.convertImageAction({ usage: "parfum", source }), "VALIDATION").fields).toEqual({
      source: IMAGE_UNREADABLE_MESSAGE,
    });
    expect(storageFake.keys()).toEqual([]);
    expect(storageFake.removedUploads).toEqual([source]);
  });
});
