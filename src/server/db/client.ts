import "server-only";
import { prisma } from "@/lib/db/prisma";
import { recordWrite } from "@/server/db/unit-of-work";

/**
 * Le client Prisma de la gestion : le client de base partagé avec la vitrine (même moteur, même pool,
 * 04 §4.5), étendu pour inscrire chaque écriture dans l'unité de travail courante (04 §10.2).
 * Les écritures `$executeRaw` sont interdites dans le code applicatif (test `table-ownership`) :
 * l'extension voit donc toutes les écritures.
 */

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

export const db = prisma.$extends({
  name: "nurea-unit-of-work",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (WRITE_OPERATIONS.has(operation)) recordWrite(model);
        return query(args);
      },
    },
  },
});

export type Db = typeof db;

/** Le client reçu dans une transaction interactive : tout sauf l'ouverture d'une autre transaction. */
export type DbTransaction = Parameters<Parameters<Db["$transaction"]>[0]>[0];
