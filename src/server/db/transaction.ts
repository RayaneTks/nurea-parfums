import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";
import { isIdempotentReplayConflict, isRetryable } from "@/server/core/errors";
import { db, type DbTransaction } from "@/server/db/client";
import { createLocks, type Locks } from "@/server/db/locks";

/**
 * Le seul point d'ouverture d'une transaction (04 §4.1). Toute écriture, d'une ligne ou de quinze,
 * passe par ici : horloge unique, verrous ordonnés, rejeu des conflits et de l'idempotence, et
 * modèles écrits inscrits dans l'unité de travail de l'action.
 */

export type Tx = {
  /** Seul accès base d'un writer. */
  readonly db: DbTransaction;
  /** Horloge unique de la transaction (horodatages, dates de valeur par défaut). */
  readonly now: Date;
  /** Verrous en ordre canonique (04 §4.2). */
  readonly lock: Locks;
};

const OPTIONS = {
  maxWait: 5_000,
  timeout: 15_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

/** Tentatives supplémentaires après un conflit d'écriture ou un interblocage. */
const MAX_CONFLICT_RETRIES = 2;

const openTransaction = new AsyncLocalStorage<true>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function inTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  if (openTransaction.getStore()) {
    throw new Error("inTransaction imbriqué : un writer reçoit `tx`, il n'ouvre pas de transaction (04 §4.1).");
  }
  let conflictRetries = 0;
  let replayed = false;
  for (;;) {
    try {
      return await openTransaction.run(true, () =>
        db.$transaction((client) => work({ db: client, now: new Date(), lock: createLocks(client) }), OPTIONS),
      );
    } catch (e) {
      // Tout a été annulé par le ROLLBACK : rejouer est sûr.
      if (isRetryable(e) && conflictRetries < MAX_CONFLICT_RETRIES) {
        conflictRetries += 1;
        await sleep(40 * conflictRetries + Math.random() * 40);
        continue;
      }
      if (isIdempotentReplayConflict(e) && !replayed) {
        replayed = true;
        continue;
      }
      throw e;
    }
  }
}
