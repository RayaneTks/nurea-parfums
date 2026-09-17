import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_MEDIA_MESSAGE, STORY_PATH_MESSAGE, type AddPerfumeMediaData } from "@/contracts/catalogue";
import {
  FOREIGN,
  INJECTED,
  OWNED,
  catalogueImage,
  expectError,
  expectOk,
  freshStart,
  loadCatalogueServer,
  stamp,
  storageFake,
  storyPath,
  type CatalogueServer,
} from "./support/catalogue";

/**
 * Visuels story (`PerfumeMedia`, 04 §12, §16.3 ; 07 J11) : chemin exactement `stories/<parfum>/…` et sans
 * `..`, URL recalculée, rang calculé sous dépôts concurrents, 24 au plus, retrait qui supprime l'objet
 * APRÈS le commit et jamais sur une transaction annulée, suppression du parfum qui lit les chemins avant
 * le DELETE. Stockage Supabase simulé.
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

const deposit = (perfumeId: number, overrides: Partial<AddPerfumeMediaData> = {}) =>
  server.actions.addPerfumeMediaAction({ perfumeId, path: storyPath(perfumeId), width: 1080, height: 1920, bytes: 350_000, ...overrides });

describe("dépôt : chemin décidé par le serveur, URL recalculée", () => {
  it("chemin hors stories/<parfum>/, d'un autre parfum ou avec `..` ⇒ VALIDATION, rien d'écrit", async () => {
    const sauvage = await perfume();
    const bleu = await perfume("Bleu");
    for (const path of [
      `perfumes/${stamp()}.webp`,
      `stories/${bleu.id}/${stamp()}.webp`,
      `stories/${sauvage.id}/../${bleu.id}/${stamp()}.webp`,
      `stories/${sauvage.id}/..%2f${stamp()}.webp`,
      `brands/${stamp()}.webp`,
    ]) {
      const error = expectError(await deposit(sauvage.id, { path }), "VALIDATION");
      expect(error.fields, path).toEqual({ path: STORY_PATH_MESSAGE });
    }
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

  it("l'URL est recalculée depuis le chemin : une URL envoyée n'est jamais crue", async () => {
    const sauvage = await perfume();
    const path = storyPath(sauvage.id);
    const input = { perfumeId: sauvage.id, path, width: 1080, height: 1920, bytes: 1, url: "https://ailleurs.example/piege.webp" };
    const item = expectOk(await server.actions.addPerfumeMediaAction(input as Parameters<typeof server.actions.addPerfumeMediaAction>[0]));
    expect(item.url).toBe(`${OWNED}${path}`);
    expect((await mediaRows())[0]).toMatchObject({ path, url: `${OWNED}${path}` });
  });

  it("parfum absent ⇒ NOT_FOUND ; même chemin renvoyé (double tap) ⇒ une seule ligne", async () => {
    expectError(await deposit(424242), "NOT_FOUND");
    const sauvage = await perfume();
    const path = storyPath(sauvage.id);
    const [first, second] = await Promise.all([deposit(sauvage.id, { path }), deposit(sauvage.id, { path })]);
    expect(expectOk(first).id).toBe(expectOk(second).id);
    expect(await mediaRows()).toHaveLength(1);
  });

  it("rang calculé dans la transaction : six dépôts simultanés prennent six rangs distincts", async () => {
    const sauvage = await perfume();
    const results = await Promise.all(Array.from({ length: 6 }, () => deposit(sauvage.id)));
    expect(results.every((r) => r.ok)).toBe(true);
    expect((await mediaRows(sauvage.id)).map((m) => m.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("25e visuel ⇒ CONFLICT « Maximum 24 visuels par parfum… », rien d'écrit", async () => {
    const sauvage = await perfume();
    for (let i = 0; i < 24; i += 1) expectOk(await deposit(sauvage.id));
    expect(expectError(await deposit(sauvage.id), "CONFLICT").message).toBe(MAX_MEDIA_MESSAGE);
    expect(await mediaRows(sauvage.id)).toHaveLength(24);
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
