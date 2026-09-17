import "server-only";
import type { ActionError } from "@/contracts/result";
import { describeDbError, isNureaTriggerError } from "@/server/core/errors";

/**
 * Une ligne JSON par action, une par lecture en erreur (04 §9.5). Journaux Vercel, sans outil tiers.
 * On n'y écrit jamais l'entrée d'une action : elle peut contenir un mot de passe ou un téléphone.
 */

export const SLOW_ACTION_MS = 1_000;

type Level = "info" | "warn" | "error";

function write(level: Level, record: Record<string, unknown>): void {
  const line = JSON.stringify({ level, at: new Date().toISOString(), ...record });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

function causeFields(cause: unknown): Record<string, unknown> {
  if (cause === undefined) return {};
  const db = describeDbError(cause);
  return {
    ...(db?.prismaCode ? { prismaCode: db.prismaCode } : {}),
    ...(db?.sqlstate ? { sqlstate: db.sqlstate } : {}),
    ...(db?.constraint ? { constraint: db.constraint } : {}),
    ...(cause instanceof Error ? { error: cause.name, detail: cause.message.slice(0, 2_000) } : {}),
  };
}

export function logAction(entry: { action: string; startedAt: number; error?: ActionError; cause?: unknown }): void {
  const ms = Date.now() - entry.startedAt;
  const code = entry.error?.code ?? "OK";
  const unexpected = code === "UNEXPECTED";
  const record: Record<string, unknown> = {
    event: "action",
    action: entry.action,
    code,
    ms,
    ...(entry.error?.reference ? { reference: entry.error.reference } : {}),
    // Le détail d'une erreur attendue (validation, réserve, refus métier) n'apprend rien : on ne le garde
    // que pour l'imprévu, l'indisponibilité et les contraintes que la validation aurait dû arrêter.
    ...(unexpected || code === "UNAVAILABLE" || describeDbError(entry.cause)?.sqlstate === "23514"
      ? causeFields(entry.cause)
      : {}),
  };
  if (unexpected && entry.cause instanceof Error && !isNureaTriggerError(entry.cause)) record.stack = entry.cause.stack;
  const level: Level =
    unexpected ? "error"
    : code === "UNAVAILABLE" || ms > SLOW_ACTION_MS || record.sqlstate === "23514" ? "warn"
    : "info";
  write(level, record);
}

/** Une lecture qui échoue (bloc, route GET) : l'écran affiche le reste, le journal garde la cause. */
export function logReadError(entry: { name: string; cause: unknown; reference?: string }): void {
  write("error", {
    event: "read",
    name: entry.name,
    ...(entry.reference ? { reference: entry.reference } : {}),
    ...causeFields(entry.cause),
  });
}

export function logEvent(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  write(level, { event, ...fields });
}
