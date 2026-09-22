import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IMAGE_NOT_RECEIVED_MESSAGE, IMAGE_TOO_HEAVY_MESSAGE, UPLOAD_PATH_MESSAGE } from "@/contracts/catalogue";

/**
 * Garde de suppression des images (07 §1.3, garde-fou 2 ; 04 §12) : `storage.ts` ne supprime QUE les URL
 * qui commencent exactement par `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`.
 * La préproduction référence les visuels de la production dans sa copie de la base : ils doivent rester
 * intouchables. Conversion côté serveur (décision du 17/09/2026) : un original n'est lu et supprimé que
 * sous `tmp/`, à la forme exacte délivrée par le serveur. Le client Supabase est simulé : aucune requête ne sort.
 */

const supabase = vi.hoisted(() => ({
  clients: [] as { url: string; key: string }[],
  removed: [] as { bucket: string; paths: string[] }[],
  signed: [] as { bucket: string; path: string; upsert: boolean | undefined }[],
  /** Objets du bucket simulé, par chemin. */
  objects: new Map<string, Uint8Array>(),
  downloads: [] as string[],
  uploads: [] as { bucket: string; path: string; contentType: string | undefined; upsert: boolean | undefined }[],
  failRemove: false,
}));

const transaction = vi.hoisted(() => ({ run: undefined as undefined | ((work: (tx: unknown) => Promise<unknown>) => Promise<unknown>) }));

vi.mock("server-only", () => ({}));
// Aucun client Prisma dans un test unitaire (`@prisma/client` chargerait `.env`, qui pointe sur la production).
vi.mock("@/server/db/transaction", () => ({
  inTransaction: (work: (tx: unknown) => Promise<unknown>) => (transaction.run ? transaction.run(work) : work({})),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string) => {
    supabase.clients.push({ url, key });
    return {
      storage: {
        from: (bucket: string) => ({
          createSignedUploadUrl: async (path: string, options?: { upsert: boolean }) => {
            supabase.signed.push({ bucket, path, upsert: options?.upsert });
            return { data: { signedUrl: `${url}/storage/v1/object/upload/sign/${bucket}/${path}?token=t`, token: "t", path }, error: null };
          },
          remove: async (paths: string[]) => {
            if (supabase.failRemove) return { data: null, error: new Error("stockage indisponible") };
            supabase.removed.push({ bucket, paths });
            for (const path of paths) supabase.objects.delete(path);
            return { data: [], error: null };
          },
          download: async (path: string) => {
            supabase.downloads.push(path);
            const bytes = supabase.objects.get(path);
            // Forme de l'API Storage pour un objet absent : HTTP 400, statusCode « 404 ».
            if (!bytes) return { data: null, error: Object.assign(new Error("Object not found"), { status: 400, statusCode: "404" }) };
            return { data: new Blob([bytes]), error: null };
          },
          upload: async (path: string, body: Uint8Array, options?: { contentType?: string; upsert?: boolean }) => {
            supabase.uploads.push({ bucket, path, contentType: options?.contentType, upsert: options?.upsert });
            supabase.objects.set(path, new Uint8Array(body));
            return { data: { path }, error: null };
          },
        }),
      },
    };
  },
}));

const PROJECT = "https://projet-essai.supabase.co";
const PREFIX = `${PROJECT}/storage/v1/object/public/catalog/`;
const STAMP = /^\d{13}-[0-9a-f]{8}$/;

let storage: typeof import("../storage");
const saved = { ...process.env };

beforeEach(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = `${PROJECT}/`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-de-service-de-test";
  process.env.SUPABASE_STORAGE_BUCKET = "catalog";
  supabase.clients.length = 0;
  supabase.removed.length = 0;
  supabase.signed.length = 0;
  supabase.objects.clear();
  supabase.downloads.length = 0;
  supabase.uploads.length = 0;
  supabase.failRemove = false;
  transaction.run = undefined;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  storage = await import("../storage");
});

afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

describe("ownedObjectPath — seule porte d'entrée d'une suppression", () => {
  it("rend le chemin d'un objet de notre projet et de notre bucket", () => {
    expect(storage.publicObjectPrefix()).toBe(PREFIX);
    expect(storage.ownedObjectPath(`${PREFIX}perfumes/1757500000000-1a2b3c4d.webp`)).toBe("perfumes/1757500000000-1a2b3c4d.webp");
    expect(storage.ownedObjectPath(`${PREFIX}stories/12/1757500000000-1a2b3c4d.webp`)).toBe(
      "stories/12/1757500000000-1a2b3c4d.webp",
    );
  });

  it("refuse une URL d'un autre projet, d'un autre hôte, d'un autre bucket ou un chemin douteux", () => {
    for (const url of [
      // La production, vue depuis la préproduction.
      "https://lkdhqqzocmxtyarseizc.supabase.co/storage/v1/object/public/catalog/perfumes/sauvage.webp",
      // Hôte qui commence pareil.
      "https://projet-essai.supabase.co.attaquant.example/storage/v1/object/public/catalog/perfumes/x.webp",
      // Autre bucket, dont un bucket dont le nom commence par « catalog ».
      `${PROJECT}/storage/v1/object/public/catalog-archive/perfumes/x.webp`,
      `${PROJECT}/storage/v1/object/public/autre/perfumes/x.webp`,
      // URL signée ou non publique du même projet.
      `${PROJECT}/storage/v1/object/sign/catalog/perfumes/x.webp?token=abc`,
      // http au lieu de https.
      `http://projet-essai.supabase.co/storage/v1/object/public/catalog/perfumes/x.webp`,
      // Remontée, requête, fragment, encodage, préfixe seul.
      `${PREFIX}perfumes/../brands/logo.webp`,
      `${PREFIX}../autre/x.webp`,
      `${PREFIX}perfumes/x.webp?download=1`,
      `${PREFIX}perfumes/x.webp#a`,
      `${PREFIX}perfumes/%2e%2e/x.webp`,
      `${PREFIX}/perfumes/x.webp`,
      PREFIX,
      // Chemins relatifs hérités de la vitrine.
      "/parfums/sauvage.webp",
      "perfumes/x.webp",
    ]) {
      expect(storage.ownedObjectPath(url), url).toBeNull();
    }
  });

  it("suit la configuration : un autre bucket configuré rend nos URL « catalog » étrangères", () => {
    process.env.SUPABASE_STORAGE_BUCKET = "catalog-preprod";
    expect(storage.ownedObjectPath(`${PREFIX}perfumes/x.webp`)).toBeNull();
    expect(storage.ownedObjectPath(`${PROJECT}/storage/v1/object/public/catalog-preprod/perfumes/x.webp`)).toBe("perfumes/x.webp");
  });
});

describe("removeOwnedObjects — supprime nos objets, jamais ceux d'un autre projet", () => {
  it("une URL d'un autre projet n'est jamais transmise au stockage", async () => {
    const foreign = "https://lkdhqqzocmxtyarseizc.supabase.co/storage/v1/object/public/catalog/perfumes/sauvage.webp";
    const result = await storage.removeOwnedObjects([foreign, `${PREFIX}brands/logo.webp`, `${PREFIX}brands/logo.webp`, ""]);
    expect(result).toEqual({ removed: ["brands/logo.webp"], ignored: [foreign] });
    expect(supabase.removed).toEqual([{ bucket: "catalog", paths: ["brands/logo.webp"] }]);
    expect(supabase.clients.map((client) => client.url)).toEqual([PROJECT]);
  });

  it("rien à nous : aucun client créé, aucun appel", async () => {
    const result = await storage.removeOwnedObjects(["https://autre-projet.supabase.co/storage/v1/object/public/catalog/x.webp"]);
    expect(result.removed).toEqual([]);
    expect(supabase.clients).toEqual([]);
    expect(supabase.removed).toEqual([]);
  });

  it("stockage en panne ou non configuré : journalisé, jamais levé", async () => {
    supabase.failRemove = true;
    await expect(storage.removeOwnedObjects([`${PREFIX}perfumes/x.webp`])).resolves.toEqual({ removed: [], ignored: [] });
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(storage.removeOwnedObjects([`${PREFIX}perfumes/x.webp`])).resolves.toEqual({
      removed: [],
      ignored: [`${PREFIX}perfumes/x.webp`],
    });
  });
});

describe("commitThenRemoveObjects — suppression après le COMMIT, jamais après un ROLLBACK", () => {
  it("transaction validée : les objets désignés sont supprimés, après elle", async () => {
    const order: string[] = [];
    transaction.run = async (work) => {
      const out = await work({});
      order.push("commit");
      return out;
    };
    const data = await storage.commitThenRemoveObjects(async () => {
      order.push("écritures");
      return { data: { deleted: true }, remove: [`${PREFIX}perfumes/x.webp`] };
    });
    order.push(...supabase.removed.map(() => "suppression"));
    expect(data).toEqual({ deleted: true });
    expect(order).toEqual(["écritures", "commit", "suppression"]);
  });

  it("transaction annulée : aucune suppression tentée", async () => {
    transaction.run = async (work) => {
      await work({});
      throw new Error("ROLLBACK");
    };
    await expect(
      storage.commitThenRemoveObjects(async () => ({ data: null, remove: [`${PREFIX}perfumes/x.webp`] })),
    ).rejects.toThrow("ROLLBACK");
    expect(supabase.removed).toEqual([]);
    expect(supabase.clients).toEqual([]);
  });
});

describe("createImageUpload — l'original part sous tmp/, chemin décidé par le serveur", () => {
  it.each([
    ["parfum", undefined, /^tmp\/perfumes\/(\d{13}-[0-9a-f]{8})\.heic$/],
    ["logo", undefined, /^tmp\/brands\/(\d{13}-[0-9a-f]{8})\.heic$/],
    ["story", 12, /^tmp\/stories\/12\/(\d{13}-[0-9a-f]{8})\.heic$/],
  ] as const)("%s", async (usage, perfumeId, pattern) => {
    const ticket = await storage.createImageUpload({ usage, perfumeId, extension: "heic" });
    expect(ticket.path).toMatch(pattern);
    expect(pattern.exec(ticket.path)?.[1]).toMatch(STAMP);
    expect(Object.keys(ticket).sort()).toEqual(["path", "signedUrl", "token"]);
    expect(supabase.signed).toEqual([{ bucket: "catalog", path: ticket.path, upsert: true }]);
  });

  it("publicUrlOf refuse un chemin qui sortirait du bucket", () => {
    expect(() => storage.publicUrlOf("../autre/x.webp")).toThrow(RangeError);
    expect(storage.publicUrlOf("stories/12/1757500000000-1a2b3c4d.webp")).toBe(`${PREFIX}stories/12/1757500000000-1a2b3c4d.webp`);
  });
});

describe("convertUpload — lit l'original sous tmp/, écrit le WebP à côté de son dossier définitif", () => {
  const ORIGINAL = "tmp/brands/1757500000000-1a2b3c4d.png";

  it("original converti : WebP écrit à brands/<même horodatage>.webp, URL recalculée ; l'original n'est pas touché ici", async () => {
    supabase.objects.set(ORIGINAL, await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer());
    const image = await storage.convertUpload(ORIGINAL, "logo");
    expect(image).toMatchObject({ path: "brands/1757500000000-1a2b3c4d.webp", url: `${PREFIX}brands/1757500000000-1a2b3c4d.webp`, width: 800, height: 800 });
    expect(supabase.downloads).toEqual([ORIGINAL]);
    expect(supabase.uploads).toEqual([{ bucket: "catalog", path: image.path, contentType: "image/webp", upsert: true }]);
    expect((await sharp(supabase.objects.get(image.path)).metadata()).format).toBe("webp");
    expect(supabase.objects.has(ORIGINAL)).toBe(true);
  });

  it("garde de bucket : un chemin hors tmp/, d'un autre usage ou douteux n'est jamais lu", async () => {
    for (const [source, usage] of [
      ["brands/1757500000000-1a2b3c4d.webp", "logo"],
      ["perfumes/1757500000000-1a2b3c4d.png", "parfum"],
      ["tmp/perfumes/1757500000000-1a2b3c4d.png", "logo"],
      ["tmp/brands/../perfumes/1757500000000-1a2b3c4d.png", "logo"],
      ["tmp/brands/1757500000000-1a2b3c4d.png?x=1", "logo"],
      ["tmp/brands/sous/1757500000000-1a2b3c4d.png", "logo"],
      ["tmp/stories/0/1757500000000-1a2b3c4d.png", "story"],
      ["/tmp/brands/1757500000000-1a2b3c4d.png", "logo"],
    ] as const) {
      await expect(storage.convertUpload(source, usage), source).rejects.toMatchObject({ code: "VALIDATION", message: UPLOAD_PATH_MESSAGE });
    }
    expect(supabase.clients).toEqual([]);
    expect(supabase.downloads).toEqual([]);
  });

  it("original absent mais WebP déjà écrit (demande déjà servie) : rendu tel quel ; ni l'un ni l'autre : refus", async () => {
    const webpBytes = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: "#222" } }).webp().toBuffer();
    supabase.objects.set("stories/12/1757500000000-1a2b3c4d.webp", webpBytes);
    const again = await storage.convertUpload("tmp/stories/12/1757500000000-1a2b3c4d.jpg", "story");
    expect(again).toMatchObject({ path: "stories/12/1757500000000-1a2b3c4d.webp", width: 1080, height: 1920, bytes: webpBytes.length });
    expect(supabase.uploads).toEqual([]);
    await expect(storage.convertUpload("tmp/stories/12/1757500000001-1a2b3c4d.jpg", "story")).rejects.toMatchObject({
      code: "VALIDATION",
      message: IMAGE_NOT_RECEIVED_MESSAGE,
    });
  });

  it("original de plus de 12 Mo : refus sans conversion ni écriture", async () => {
    supabase.objects.set(ORIGINAL, new Uint8Array(12 * 1024 * 1024 + 1));
    await expect(storage.convertUpload(ORIGINAL, "logo")).rejects.toMatchObject({ code: "VALIDATION", message: IMAGE_TOO_HEAVY_MESSAGE });
    expect(supabase.uploads).toEqual([]);
  });

  it("thenRemoveUpload : l'original est supprimé après le geste, qu'il aboutisse ou non ; jamais un autre chemin", async () => {
    const order: string[] = [];
    supabase.objects.set(ORIGINAL, new Uint8Array(1));
    await storage.thenRemoveUpload(ORIGINAL, async () => void order.push("geste"));
    order.push(...supabase.removed.map((entry) => `suppression ${entry.paths.join(",")}`));
    expect(order).toEqual(["geste", `suppression ${ORIGINAL}`]);

    supabase.removed.length = 0;
    await expect(storage.thenRemoveUpload(ORIGINAL, async () => Promise.reject(new Error("refus")))).rejects.toThrow("refus");
    expect(supabase.removed).toEqual([{ bucket: "catalog", paths: [ORIGINAL] }]);

    supabase.removed.length = 0;
    await storage.removeUpload("brands/1757500000000-1a2b3c4d.webp");
    await storage.removeUpload(`${PREFIX}${ORIGINAL}`);
    expect(supabase.removed).toEqual([]);

    supabase.failRemove = true;
    await expect(storage.removeUpload(ORIGINAL)).resolves.toBeUndefined();
  });
});
