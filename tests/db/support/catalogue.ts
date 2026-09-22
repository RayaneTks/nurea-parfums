/**
 * Harnais des tests du catalogue (07 J11 ; 04 §12, §16.3) : modules serveur chargés contre la base de test,
 * session signée, stockage Supabase SIMULÉ, jeux de données minimaux.
 *
 * Chaque fichier de test déclare lui-même, au niveau du module (hissés par Vitest) :
 *   vi.hoisted(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet-essai-j11.supabase.co"; … });
 *   vi.mock("server-only", () => ({}));
 *   vi.mock("next/cache", …); vi.mock("next/headers", …);
 *   vi.mock("@supabase/supabase-js", async () => (await import("./support/catalogue")).fakeSupabaseModule());
 * Les variables de stockage sont posées AVANT tout import de `@prisma/client`, qui charge `.env` (la
 * production) sans écraser une variable déjà présente ; et le client Supabase est simulé : aucune requête
 * ne peut atteindre un bucket réel.
 */
import sharp from "sharp";
import { expect } from "vitest";
import type { ImageUsage } from "@/contracts/catalogue";
import type { ActionResult } from "@/contracts/result";
import { resetDatabase } from "./database";
import { memoryCookies, useTestDatabaseForServer as pinServerToTestDatabase } from "./server";

export const TEST_SUPABASE_URL = "https://projet-essai-j11.supabase.co";
export const TEST_BUCKET = "catalog";
/** Préfixe des objets de NOTRE bucket de test. */
export const OWNED = `${TEST_SUPABASE_URL}/storage/v1/object/public/${TEST_BUCKET}/`;
/** Un visuel de la production, tel que la copie de préproduction le référence. */
export const FOREIGN = "https://lkdhqqzocmxtyarseizc.supabase.co/storage/v1/object/public/catalog/";

// ── Stockage simulé ────────────────────────────────────────────────────────────

const isUpload = (path: string) => path.startsWith("tmp/");

export const storageFake = {
  clients: [] as string[],
  signed: [] as string[],
  /** Objets du bucket simulé, par chemin : l'original que l'appareil envoie, le WebP que le serveur écrit. */
  objects: new Map<string, Uint8Array>(),
  /** Lectures (`download`) et écritures (`upload`) du serveur, chemins dans le bucket. */
  downloads: [] as string[],
  uploads: [] as { path: string; contentType: string | undefined; upsert: boolean | undefined }[],
  /** Suppressions d'objets du catalogue : un appel `remove` par entrée. Les originaux `tmp/` sont à part. */
  removed: [] as string[][],
  /** Originaux `tmp/` supprimés après conversion. */
  removedUploads: [] as string[],
  /** Observateur appelé au moment de la suppression d'objets du catalogue (vérifier que la ligne est déjà partie). */
  onRemove: undefined as undefined | ((paths: string[]) => Promise<void>),
  /** Observateur appelé au moment de la suppression d'un original (vérifier que l'URL est déjà enregistrée). */
  onRemoveUpload: undefined as undefined | ((paths: string[]) => Promise<void>),
  reset() {
    this.clients.length = 0;
    this.signed.length = 0;
    this.objects.clear();
    this.downloads.length = 0;
    this.uploads.length = 0;
    this.removed.length = 0;
    this.removedUploads.length = 0;
    this.onRemove = undefined;
    this.onRemoveUpload = undefined;
  },
  /** Chemins présents sous un préfixe, triés. */
  keys(prefix = "") {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort();
  },
};

export function fakeSupabaseModule() {
  return {
    createClient: (url: string) => {
      storageFake.clients.push(url);
      return {
        storage: {
          from: (bucket: string) => ({
            createSignedUploadUrl: async (path: string) => {
              storageFake.signed.push(path);
              return { data: { signedUrl: `${url}/storage/v1/object/upload/sign/${bucket}/${path}?token=t`, token: "t", path }, error: null };
            },
            download: async (path: string) => {
              storageFake.downloads.push(path);
              const bytes = storageFake.objects.get(path);
              // Forme de l'API Storage pour un objet absent : HTTP 400, statusCode « 404 ».
              if (!bytes) return { data: null, error: Object.assign(new Error("Object not found"), { status: 400, statusCode: "404" }) };
              return { data: new Blob([bytes]), error: null };
            },
            upload: async (path: string, body: Uint8Array, options?: { contentType?: string; upsert?: boolean }) => {
              if (storageFake.objects.has(path) && !options?.upsert) {
                return { data: null, error: Object.assign(new Error("The resource already exists"), { status: 400, statusCode: "409" }) };
              }
              storageFake.uploads.push({ path, contentType: options?.contentType, upsert: options?.upsert });
              storageFake.objects.set(path, new Uint8Array(body));
              return { data: { path }, error: null };
            },
            remove: async (paths: string[]) => {
              const uploads = paths.filter(isUpload);
              const catalogue = paths.filter((path) => !isUpload(path));
              if (uploads.length > 0) {
                await storageFake.onRemoveUpload?.(uploads);
                storageFake.removedUploads.push(...uploads);
              }
              if (catalogue.length > 0) {
                await storageFake.onRemove?.(catalogue);
                storageFake.removed.push(catalogue);
              }
              for (const path of paths) storageFake.objects.delete(path);
              return { data: [], error: null };
            },
          }),
        },
      };
    },
  };
}

// ── Modules serveur ────────────────────────────────────────────────────────────

export type CatalogueServer = {
  prisma: typeof import("@/lib/db/prisma").prisma;
  inTransaction: typeof import("@/server/db/transaction").inTransaction;
  actions: typeof import("@/server/catalogue/actions");
  writer: typeof import("@/server/catalogue/writer");
  media: typeof import("@/server/catalogue/media");
  storage: typeof import("@/server/catalogue/storage");
  queries: typeof import("@/server/catalogue/queries");
  signSessionToken: typeof import("@/server/auth/token").signSessionToken;
};

export async function loadCatalogueServer(): Promise<CatalogueServer> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== TEST_SUPABASE_URL) {
    throw new Error("Tests du catalogue : le stockage n'est pas branché sur le projet fictif (vi.hoisted manquant).");
  }
  await pinServerToTestDatabase();
  return {
    prisma: (await import("@/lib/db/prisma")).prisma,
    inTransaction: (await import("@/server/db/transaction")).inTransaction,
    actions: await import("@/server/catalogue/actions"),
    writer: await import("@/server/catalogue/writer"),
    media: await import("@/server/catalogue/media"),
    storage: await import("@/server/catalogue/storage"),
    queries: await import("@/server/catalogue/queries"),
    signSessionToken: (await import("@/server/auth/token")).signSessionToken,
  };
}

/** Base vide, stockage vidé, session valide : à appeler dans `beforeEach`. */
export async function freshStart(server: CatalogueServer): Promise<ReturnType<typeof memoryCookies>["store"]> {
  await resetDatabase(server.prisma);
  storageFake.reset();
  const cookies = memoryCookies();
  cookies.store.set("nurea_admin", await server.signSessionToken({ userId: "u-test", username: "gerant" }));
  return cookies.store;
}

// ── Résultats d'action ─────────────────────────────────────────────────────────

export function expectOk<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(`Action refusée : ${result.error.code} — ${result.error.message}`);
  return result.data;
}

export function expectError<T>(result: ActionResult<T>, code: string) {
  expect(result.ok, result.ok ? "l'action aurait dû échouer" : "").toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.error.code, result.error.message).toBe(code);
  return result.error;
}

// ── Jeux de données ────────────────────────────────────────────────────────────

let counter = 0;

/** Un horodatage-aléa unique, forme du serveur. */
export function stamp(): string {
  counter += 1;
  return `${1757500000000 + counter}-${counter.toString(16).padStart(8, "0")}`;
}

/** URL d'un visuel de catalogue dans notre bucket. */
export const catalogueImage = () => `${OWNED}perfumes/${stamp()}.webp`;

/** Chemin définitif d'un visuel story, forme du serveur (pour éprouver le writer directement). */
export const storyPath = (perfumeId: number) => `stories/${perfumeId}/${stamp()}.webp`;

/** Chemin d'original qu'aurait délivré `createImageUploadUrlAction({ usage: "story", perfumeId })`, sans ticket. */
export const storyUploadPath = (perfumeId: number, extension = "png") => `tmp/stories/${perfumeId}/${stamp()}.${extension}`;

let sample: Promise<Buffer> | null = null;

/** Une petite planche PNG 9:16, fabriquée une fois : l'original « envoyé par l'appareil » par défaut. */
export function samplePng(): Promise<Buffer> {
  sample ??= sharp({ create: { width: 90, height: 160, channels: 3, background: { r: 123, g: 11, b: 29 } } }).png().toBuffer();
  return sample;
}

/**
 * Ce que fait l'appareil (04 §12) : demander le chemin temporaire signé, puis y envoyer l'original (PUT
 * direct au bucket, simulé). Rend la `source` à passer à la conversion.
 */
export async function sendOriginal(
  server: CatalogueServer,
  input: { usage: ImageUsage; perfumeId?: number; extension?: string },
  bytes?: Uint8Array,
): Promise<string> {
  const ticket = expectOk(await server.actions.createImageUploadUrlAction({ extension: "png", ...input }));
  storageFake.objects.set(ticket.path, bytes ?? (await samplePng()));
  return ticket.path;
}

/** Octets RIFF….WEBP : l'objet stocké est bien un WebP. */
export function isWebp(bytes: Uint8Array | undefined): boolean {
  return bytes !== undefined && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP";
}

export function perfumeCount(server: CatalogueServer) {
  return server.prisma.perfume.count();
}

// ── Atomicité ──────────────────────────────────────────────────────────────────

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

export const INJECTED = "échec injecté après une écriture";

/**
 * Le `tx` d'une transaction dont la N-ième écriture Prisma aboutit en base, puis lève : la transaction est
 * annulée, rien de ce qu'elle a écrit ne doit subsister.
 */
export function failingAfterWrite<T extends { db: object }>(tx: T, nth = 1): T & { written: string[] } {
  const written: string[] = [];
  const db = new Proxy(tx.db, {
    get(target, property) {
      const delegate = Reflect.get(target, property);
      if (typeof property !== "string" || property.startsWith("$") || delegate === null || typeof delegate !== "object") {
        return typeof delegate === "function" ? delegate.bind(target) : delegate;
      }
      return new Proxy(delegate, {
        get(model, operation) {
          const method = Reflect.get(model, operation);
          if (typeof operation !== "string" || !WRITE_OPERATIONS.has(operation) || typeof method !== "function") {
            return typeof method === "function" ? method.bind(model) : method;
          }
          return async (...args: unknown[]) => {
            const result = await (method as (...a: unknown[]) => Promise<unknown>).apply(model, args);
            written.push(`${property}.${operation}`);
            if (written.length >= nth) throw new Error(`${INJECTED} (${written.join(", ")})`);
            return result;
          };
        },
      });
    },
  });
  return Object.assign({}, tx, { db, written });
}
