import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Garde de suppression des images (07 §1.3, garde-fou 2 ; 04 §12) : `storage.ts` ne supprime QUE les URL
 * qui commencent exactement par `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`.
 * La préproduction référence les visuels de la production dans sa copie de la base : ils doivent rester
 * intouchables. Le client Supabase est simulé : aucune requête ne sort.
 */

const supabase = vi.hoisted(() => ({
  clients: [] as { url: string; key: string }[],
  removed: [] as { bucket: string; paths: string[] }[],
  signed: [] as { bucket: string; path: string; upsert: boolean | undefined }[],
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
            return { data: [], error: null };
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

describe("createImageUpload — chemin décidé par le serveur, URL publique recalculée", () => {
  it.each([
    ["parfum", undefined, /^perfumes\/(\d{13}-[0-9a-f]{8})\.webp$/],
    ["logo", undefined, /^brands\/(\d{13}-[0-9a-f]{8})\.webp$/],
    ["story", 12, /^stories\/12\/(\d{13}-[0-9a-f]{8})\.webp$/],
  ] as const)("%s", async (usage, perfumeId, pattern) => {
    const ticket = await storage.createImageUpload({ usage, perfumeId, extension: "webp" });
    expect(ticket.path).toMatch(pattern);
    expect(pattern.exec(ticket.path)?.[1]).toMatch(STAMP);
    expect(ticket.publicUrl).toBe(`${PREFIX}${ticket.path}`);
    expect(supabase.signed).toEqual([{ bucket: "catalog", path: ticket.path, upsert: true }]);
  });

  it("publicUrlOf refuse un chemin qui sortirait du bucket", () => {
    expect(() => storage.publicUrlOf("../autre/x.webp")).toThrow(RangeError);
    expect(storage.publicUrlOf("stories/12/1757500000000-1a2b3c4d.webp")).toBe(`${PREFIX}stories/12/1757500000000-1a2b3c4d.webp`);
  });
});
