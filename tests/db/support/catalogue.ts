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
import { expect } from "vitest";
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

export const storageFake = {
  clients: [] as string[],
  signed: [] as string[],
  /** Un appel `remove` par entrée, chemins dans le bucket. */
  removed: [] as string[][],
  /** Observateur appelé au moment de la suppression (vérifier que la ligne est déjà partie). */
  onRemove: undefined as undefined | ((paths: string[]) => Promise<void>),
  reset() {
    this.clients.length = 0;
    this.signed.length = 0;
    this.removed.length = 0;
    this.onRemove = undefined;
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
            remove: async (paths: string[]) => {
              await storageFake.onRemove?.(paths);
              storageFake.removed.push([...paths]);
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

/** Chemin qu'aurait délivré `createImageUploadUrlAction({ usage: "story", perfumeId })`. */
export const storyPath = (perfumeId: number) => `stories/${perfumeId}/${stamp()}.webp`;

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
