import "server-only";
import type { ZodError } from "zod";
import type { ActionError } from "@/contracts/result";
import { fieldMessages } from "@/contracts/zod-fr";
import { DomainError, NeedsConfirmation } from "@/domain/errors";
import { ConfigurationError } from "@/server/env";
import {
  BUSY_MESSAGE,
  CHECK_FALLBACK_MESSAGE,
  CHECK_MESSAGES,
  FOREIGN_KEY_TARGETS,
  NOT_FOUND_FALLBACK_MESSAGE,
  NOT_FOUND_MESSAGES,
  RESTRICT_FALLBACK_MESSAGE,
  RESTRICT_MESSAGES,
  SESSION_EXPIRED_MESSAGE,
  UNIQUE_FALLBACK_MESSAGE,
  UNIQUE_MESSAGES,
  UNREACHABLE_MESSAGE,
  UNREACHABLE_READ_MESSAGE,
  VALIDATION_MESSAGE,
  unexpectedMessage,
} from "@/server/core/error-messages";

/**
 * Seul fichier qui lit un code Prisma ou un SQLSTATE (04 §9.3). Un message Prisma brut n'atteint
 * jamais l'écran : tout ce qui n'est pas reconnu devient `UNEXPECTED` avec une référence, la même
 * que dans le journal.
 */

/** Session absente, expirée ou falsifiée : `defineAction` rend `SESSION_EXPIRED`, `defineQuery` redirige. */
export class SessionExpired extends Error {
  override readonly name = "SessionExpired";

  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
  }
}

export type DbErrorDescription = {
  prismaCode?: string;
  sqlstate?: string;
  constraint?: string;
  modelName?: string;
  target?: string[];
};

type PrismaLikeError = Error & { code?: unknown; meta?: Record<string, unknown> };

function isPrismaError(e: unknown): e is PrismaLikeError {
  return e instanceof Error && e.name.startsWith("PrismaClient");
}

const UNREACHABLE_PRISMA_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const UNREACHABLE_SQLSTATES = new Set(["57014", "57P01", "08000", "08003", "08006"]);
const RETRYABLE_SQLSTATES = new Set(["40001", "40P01"]);

/**
 * Ce que la base a dit, sous une forme stable. Les erreurs de requête Prisma ne portent pas toutes un
 * code : un CHECK ou un trigger arrive en `PrismaClientUnknownRequestError` dont seul le texte
 * contient le SQLSTATE et le nom de contrainte (forme relevée sur Prisma 6.19).
 */
export function describeDbError(e: unknown): DbErrorDescription | null {
  if (!isPrismaError(e)) return null;
  const meta = e.meta ?? {};
  const description: DbErrorDescription = {};
  if (typeof e.code === "string") description.prismaCode = e.code;
  if (typeof meta.modelName === "string") description.modelName = meta.modelName;
  if (Array.isArray(meta.target)) description.target = meta.target.map(String);
  else if (typeof meta.target === "string") description.target = [meta.target];

  if (typeof meta.code === "string") description.sqlstate = meta.code;
  const sqlstate = /code: "([0-9A-Z]{5})"/.exec(e.message);
  if (!description.sqlstate && sqlstate) description.sqlstate = sqlstate[1];

  const fieldName = typeof meta.field_name === "string" ? /(\w+_fkey)/.exec(meta.field_name) : null;
  const quoted = /constraint \\?"(\w+)\\?"/.exec(e.message);
  const constraint = typeof meta.constraint === "string" ? meta.constraint : (fieldName?.[1] ?? quoted?.[1]);
  if (constraint) description.constraint = constraint;
  return description;
}

/** Message levé par un trigger `nurea_*` (03 §4.10) : un writer a enfreint une règle d'or. */
export function isNureaTriggerError(e: unknown): boolean {
  return e instanceof Error && /Nuréa : /.test(e.message);
}

/** Conflit d'écriture ou interblocage : tout a été annulé, rejouer la transaction est sûr (04 §4.1). */
export function isRetryable(e: unknown): boolean {
  const db = describeDbError(e);
  if (!db) return false;
  return db.prismaCode === "P2034" || (db.sqlstate !== undefined && RETRYABLE_SQLSTATES.has(db.sqlstate));
}

/**
 * Deux envois du même identifiant se sont croisés : le second a buté sur la clé primaire. Le rejeu
 * trouvera la ligne du premier (04 §3.6). Toute clé primaire `id` est concernée, pas seulement celles
 * de `SaleDocument`, `Payment` et `BatchExpense` : ailleurs l'id vient de `cuid()` et ne se croise pas.
 */
export function isIdempotentReplayConflict(e: unknown): boolean {
  const db = describeDbError(e);
  return db?.prismaCode === "P2002" && db.target?.length === 1 && db.target[0] === "id";
}

/** Référence courte, lisible au téléphone, retrouvable dans le journal. */
export function newErrorReference(): string {
  return globalThis.crypto.randomUUID().slice(0, 4).toUpperCase();
}

export function validationError(error: ZodError): ActionError {
  return { code: "VALIDATION", message: VALIDATION_MESSAGE, fields: fieldMessages(error), retryable: false };
}

function unexpected(operation: "write" | "read"): ActionError {
  const reference = newErrorReference();
  return { code: "UNEXPECTED", message: unexpectedMessage(reference, operation), reference, retryable: false };
}

function fromDatabase(db: DbErrorDescription, e: unknown, operation: "write" | "read"): ActionError | null {
  const unreachable = operation === "write" ? UNREACHABLE_MESSAGE : UNREACHABLE_READ_MESSAGE;
  if (isRetryable(e)) return { code: "UNAVAILABLE", message: BUSY_MESSAGE, retryable: true };
  if (
    (db.prismaCode && UNREACHABLE_PRISMA_CODES.has(db.prismaCode)) ||
    (db.sqlstate && UNREACHABLE_SQLSTATES.has(db.sqlstate)) ||
    (e instanceof Error && e.name === "PrismaClientInitializationError")
  ) {
    return { code: "UNAVAILABLE", message: unreachable, retryable: true };
  }
  if (isNureaTriggerError(e)) return null;

  if (db.prismaCode === "P2002" && !isIdempotentReplayConflict(e)) {
    const key = `${db.modelName ?? ""}.${(db.target ?? []).join(",")}`;
    return { code: "CONFLICT", message: UNIQUE_MESSAGES[key] ?? UNIQUE_FALLBACK_MESSAGE, retryable: false };
  }
  if (db.prismaCode === "P2025") {
    const message = (db.modelName && NOT_FOUND_MESSAGES[db.modelName]) || NOT_FOUND_FALLBACK_MESSAGE;
    return { code: "NOT_FOUND", message, retryable: false };
  }
  if (db.prismaCode === "P2003" && db.constraint) {
    // La contrainte appartient à la table écrite : la ligne visée a disparu. Sinon, c'est la
    // suppression d'une ligne encore référencée (`Restrict`).
    const owner = db.constraint.split("_")[0];
    if (owner === db.modelName) {
      const target = FOREIGN_KEY_TARGETS[db.constraint];
      const message = (target && NOT_FOUND_MESSAGES[target]) || NOT_FOUND_FALLBACK_MESSAGE;
      return { code: "NOT_FOUND", message, retryable: false };
    }
    return { code: "CONFLICT", message: RESTRICT_MESSAGES[db.constraint] ?? RESTRICT_FALLBACK_MESSAGE, retryable: false };
  }
  if (db.sqlstate === "23514") {
    const message = (db.constraint && CHECK_MESSAGES[db.constraint]) || CHECK_FALLBACK_MESSAGE;
    return { code: "CONFLICT", message, retryable: false };
  }
  return null;
}

/** Toute exception levée sous `defineAction`, `defineReadRoute` ou dans un bloc, en `ActionError`. */
export function toActionError(e: unknown, operation: "write" | "read" = "write"): ActionError {
  if (e instanceof DomainError) {
    return {
      code: e.code,
      message: e.message,
      ...(e.code === "VALIDATION" ? { fields: { [e.field ?? ""]: e.message } } : {}),
      retryable: false,
    };
  }
  if (e instanceof NeedsConfirmation) {
    return {
      code: "NEEDS_CONFIRMATION",
      message: e.title,
      confirm: { title: e.title, reserves: [...e.reserves], confirmLabel: e.confirmLabel },
      retryable: false,
    };
  }
  if (e instanceof SessionExpired) return { code: "SESSION_EXPIRED", message: SESSION_EXPIRED_MESSAGE, retryable: false };
  if (e instanceof ConfigurationError) return { code: "UNAVAILABLE", message: `${e.message}.`, retryable: false };

  const db = describeDbError(e);
  if (db) return fromDatabase(db, e, operation) ?? unexpected(operation);
  return unexpected(operation);
}
