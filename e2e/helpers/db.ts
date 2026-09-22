import type { PrismaClient } from "@prisma/client";
import { assertNotProduction } from "../../scripts/lib/garde-hote";
import { E2E_DATABASE_URL, E2E_REMOTE } from "../support/env";

/**
 * Lecture de la base des tests de bout en bout, pour confronter l'écran à la base (04 §16.4 « le chiffre
 * affiché est confronté à la requête de 03 §5 exécutée sur la base de test »). Base e2e locale uniquement,
 * jamais en mode distant ; URL explicite (jamais `.env`).
 */
export async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  if (E2E_REMOTE) throw new Error("Lecture de base e2e refusée en mode distant.");
  const url = assertNotProduction(E2E_DATABASE_URL, "Tests de bout en bout");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

/** Total, payé, dû et statut d'un document, lus dans la vue `DocumentBalance` (03 §5.1). */
export function documentBalance(id: string) {
  return withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ status: string; total: string; paid: string; due: string }[]>(
      `SELECT status::text AS status, total::text AS total, paid::text AS paid, due::text AS due FROM "DocumentBalance" WHERE "documentId" = $1`,
      id,
    );
    return row ?? null;
  });
}

/** Paiements d'un document avec leur mouvement, dans l'ordre d'écriture. */
export function paymentsOf(id: string) {
  return withE2eDb((db) =>
    db.payment.findMany({
      where: { documentId: id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, kind: true, movement: { select: { amount: true, pocketId: true, occurredAt: true, reversesId: true } } },
    }),
  );
}
