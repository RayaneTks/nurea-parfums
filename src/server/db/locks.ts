import "server-only";
import { Prisma } from "@prisma/client";

/**
 * Verrous de ligne en ordre canonique (03 §4.3, 04 §4.2) : documents → lots → poches → parfums,
 * par identifiant croissant dans chaque rang. Deux transactions qui verrouillent les mêmes lignes
 * les prennent dans le même ordre : elles s'attendent au lieu de s'interbloquer.
 */

type LockMode = "update" | "share";

export type LockRequest = {
  /** `FOR UPDATE`. Un document neuf (T1) ne se verrouille pas : personne d'autre ne le voit. */
  documents?: readonly string[];
  /** `FOR SHARE` pour rattacher (T13), `FOR UPDATE` pour supprimer. */
  batches?: { update?: readonly string[]; share?: readonly string[] };
  /** `FOR UPDATE` quand une sortie peut rendre « Non attribué » négatif, `FOR SHARE` sinon. */
  pockets?: { update?: readonly string[]; share?: readonly string[] };
  /** `FOR UPDATE` ; le stock verrouillé est rendu pour la relecture de `applyDeliveredDeltas` (04 §11). */
  perfumes?: readonly number[];
};

/** Les lignes réellement verrouillées : un identifiant absent n'y figure pas (entité disparue). */
export type LockResult = {
  documents: string[];
  batches: string[];
  pockets: string[];
  perfumes: { id: number; stock: number | null }[];
};

type Category = "documents" | "batches" | "pockets" | "perfumes";

const RANK: Record<Category, number> = { documents: 1, batches: 2, pockets: 3, perfumes: 4 };

/** Erreur de programmation : remontée en `UNEXPECTED`, jamais rejouée. */
export class LockOrderError extends Error {
  override readonly name = "LockOrderError";
}

export type Locks = {
  (request: LockRequest): Promise<LockResult>;
  /** Mode sous lequel la ligne est verrouillée dans cette transaction (`insertMovement` l'exige). */
  held(category: Category, id: string | number): LockMode | null;
};

/** Client de requêtes brutes d'une transaction (lectures `SELECT … FOR UPDATE` uniquement). */
type RawReader = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Prisma.PrismaPromise<T> };

const TABLES = { documents: "SaleDocument", batches: "Batch", pockets: "Pocket" } as const;

/** Ids triés, chacun avec son mode ; « update » l'emporte si un id est demandé dans les deux. */
function plan(modes: { update?: readonly string[]; share?: readonly string[] }): [string, LockMode][] {
  const byId = new Map<string, LockMode>();
  for (const id of modes.share ?? []) byId.set(id, "share");
  for (const id of modes.update ?? []) byId.set(id, "update");
  return [...byId.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Découpe en séries contiguës de même mode, pour garder l'ordre des ids avec peu de requêtes. */
function runs(entries: [string, LockMode][]): { mode: LockMode; ids: string[] }[] {
  const out: { mode: LockMode; ids: string[] }[] = [];
  for (const [id, mode] of entries) {
    const last = out.at(-1);
    if (last && last.mode === mode) last.ids.push(id);
    else out.push({ mode, ids: [id] });
  }
  return out;
}

export function createLocks(client: RawReader): Locks {
  let lastRank = 0;
  const held = new Map<string, LockMode>();
  const key = (category: Category, id: string | number) => `${category}:${id}`;

  async function lockText(category: "documents" | "batches" | "pockets", entries: [string, LockMode][]) {
    const locked: string[] = [];
    for (const { mode, ids } of runs(entries)) {
      const table = Prisma.raw(`"${TABLES[category]}"`);
      const clause = Prisma.raw(mode === "update" ? "FOR UPDATE" : "FOR SHARE");
      const rows = await client.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM ${table} WHERE id = ANY(${ids}::text[]) ORDER BY id ${clause}`,
      );
      for (const row of rows) {
        const previous = held.get(key(category, row.id));
        held.set(key(category, row.id), previous === "update" ? "update" : mode);
        locked.push(row.id);
      }
    }
    return locked;
  }

  const lock = async function lock(request: LockRequest): Promise<LockResult> {
    const requested = (Object.keys(RANK) as Category[]).filter((category) => {
      const value = request[category];
      if (value === undefined) return false;
      if (Array.isArray(value)) return value.length > 0;
      const modes = value as { update?: readonly string[]; share?: readonly string[] };
      return (modes.update?.length ?? 0) + (modes.share?.length ?? 0) > 0;
    });
    const lowest = Math.min(...requested.map((category) => RANK[category]));
    if (requested.length > 0 && lowest < lastRank) {
      throw new LockOrderError(
        `Verrous hors ordre : ${requested.join(", ")} demandé après un verrou de rang ${lastRank} ` +
          "(ordre canonique documents → lots → poches → parfums, 04 §4.2).",
      );
    }

    const result: LockResult = { documents: [], batches: [], pockets: [], perfumes: [] };
    if (request.documents?.length) {
      result.documents = await lockText("documents", plan({ update: request.documents }));
    }
    if (request.batches) result.batches = await lockText("batches", plan(request.batches));
    if (request.pockets) result.pockets = await lockText("pockets", plan(request.pockets));
    if (request.perfumes?.length) {
      const ids = [...new Set(request.perfumes)].sort((a, b) => a - b);
      result.perfumes = await client.$queryRaw<{ id: number; stock: number | null }[]>(
        Prisma.sql`SELECT id, stock FROM "Perfume" WHERE id = ANY(${ids}::int[]) ORDER BY id FOR UPDATE`,
      );
      for (const row of result.perfumes) held.set(key("perfumes", row.id), "update");
    }
    if (requested.length > 0) lastRank = Math.max(lastRank, ...requested.map((category) => RANK[category]));
    return result;
  } as Locks;

  lock.held = (category, id) => held.get(key(category, id)) ?? null;
  return lock;
}
