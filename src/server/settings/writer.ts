import "server-only";
import type { SettingsSummary, UpdateSettingsData } from "@/contracts/settings";
import { DomainError } from "@/domain/errors";
import { rateFromDb, toDb } from "@/domain/money";
import type { Tx } from "@/server/db/transaction";

/**
 * Seul fichier qui écrit `Setting` (03 §4.2, 04 §4.3) : l'écran Réglages (N3) et la mémoire de la poche
 * choisie (N2), appelée par les encaissements (T1, T7) et les dépenses (T9). Une seule ligne (CHECK id = 1),
 * créée à la première écriture : une base neuve n'a pas encore de réglages et lit les valeurs par défaut.
 *
 * « Préférence de saisie, jamais source d'un chiffre » (03 §4.6) : deux écrivains assumés, le dernier choix
 * gagne.
 */

const SETTING_ID = 1;

/** Taux proposé tant qu'aucun réglage n'existe (valeur de l'existant, 01 §3.2). */
export const DEFAULT_EXCHANGE_RATE = "277";

const POCKET_NOT_FOUND = "Cette poche n'existe plus. Choisis-en une autre.";

/** Réglages lus dans la transaction ; valeurs par défaut si la ligne n'existe pas encore. */
export async function readSettings(tx: Tx): Promise<SettingsSummary> {
  const row = await tx.db.setting.findUnique({
    where: { id: SETTING_ID },
    select: { defaultExchangeRate: true, defaultPocketId: true },
  });
  return {
    defaultExchangeRate: toDb(rateFromDb(row?.defaultExchangeRate ?? DEFAULT_EXCHANGE_RATE)),
    defaultPocketId: row?.defaultPocketId ?? null,
  };
}

async function writeSettings(
  tx: Tx,
  data: { defaultExchangeRate?: string; defaultPocketId?: string | null },
): Promise<void> {
  await tx.db.setting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, defaultExchangeRate: data.defaultExchangeRate ?? DEFAULT_EXCHANGE_RATE, defaultPocketId: data.defaultPocketId ?? null },
    update: data,
    select: { id: true },
  });
}

/**
 * Poche proposée, telle qu'elle se mémorise : la poche système « Non attribué » se mémorise en `NULL` (c'est
 * déjà ce que `NULL` propose) ; une poche archivée ne peut plus être proposée.
 */
async function storablePocket(tx: Tx, pocketId: string | null): Promise<string | null> {
  if (pocketId === null) return null;
  const pocket = await tx.db.pocket.findUnique({ where: { id: pocketId }, select: { name: true, isSystem: true, archived: true } });
  if (!pocket) throw new DomainError("NOT_FOUND", POCKET_NOT_FOUND, "defaultPocketId");
  if (pocket.isSystem) return null;
  if (pocket.archived) {
    throw new DomainError("CONFLICT", `La poche « ${pocket.name} » est archivée : choisis une poche active.`);
  }
  return pocketId;
}

/** Écran Réglages (E08) : un champ absent n'est pas touché. */
export async function updateSettings(tx: Tx, input: UpdateSettingsData): Promise<SettingsSummary> {
  const data: { defaultExchangeRate?: string; defaultPocketId?: string | null } = {};
  if (input.defaultExchangeRate !== undefined) data.defaultExchangeRate = input.defaultExchangeRate;
  if (input.defaultPocketId !== undefined) data.defaultPocketId = await storablePocket(tx, input.defaultPocketId);
  const current = await readSettings(tx);
  const unchanged =
    (data.defaultExchangeRate === undefined || toDb(rateFromDb(data.defaultExchangeRate)) === current.defaultExchangeRate) &&
    (data.defaultPocketId === undefined || data.defaultPocketId === current.defaultPocketId);
  if (!unchanged) await writeSettings(tx, data);
  return readSettings(tx);
}

/**
 * N2 : la poche choisie pour un encaissement ou une dépense devient la poche proposée la prochaine fois.
 * N'écrit que si elle change. `pocketId` est une poche déjà verrouillée et vérifiée par le mouvement écrit
 * dans la même transaction.
 */
export async function rememberPocket(tx: Tx, pocketId: string): Promise<void> {
  const next = await storablePocket(tx, pocketId);
  const current = await readSettings(tx);
  if (current.defaultPocketId === next) return;
  await writeSettings(tx, { defaultPocketId: next });
}

/** Une poche archivée cesse d'être proposée (T15) ; « Non attribué » l'est de nouveau. */
export async function forgetPocket(tx: Tx, pocketId: string): Promise<void> {
  const current = await readSettings(tx);
  if (current.defaultPocketId !== pocketId) return;
  await writeSettings(tx, { defaultPocketId: null });
}
