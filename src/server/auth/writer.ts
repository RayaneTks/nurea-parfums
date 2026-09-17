import "server-only";
import type { Tx } from "@/server/db/transaction";

/**
 * Seul fichier qui écrit `AdminUser` (04 §4.3) : compteur d'échecs, verrouillage temporaire (04 §8.5),
 * création ou réinitialisation du compte par `scripts/create-admin.ts`.
 */

/** Échecs consécutifs qui déclenchent le premier verrouillage. */
export const LOCK_THRESHOLD = 5;
export const MAX_LOCK_MINUTES = 15;

export type LoginAccount = {
  id: string;
  username: string;
  passwordHash: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
};

/**
 * Durée du verrou après `failures` échecs consécutifs : 1 min au 5ᵉ, doublée à chaque échec suivant
 * (2, 4, 8), plafonnée à 15 min. `null` sous le seuil.
 */
export function lockMinutesAfter(failures: number): number | null {
  if (failures < LOCK_THRESHOLD) return null;
  return Math.min(2 ** (failures - LOCK_THRESHOLD), MAX_LOCK_MINUTES);
}

/** Minutes restantes, arrondies au-dessus : « Réessaie dans 4 min. » n'annonce jamais trop peu. */
export function remainingLockMinutes(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));
}

/** Lecture sous verrou de ligne : deux essais simultanés ne perdent pas un échec. */
export async function findAccountForLogin(tx: Tx, username: string): Promise<LoginAccount | null> {
  const rows = await tx.db.$queryRaw<LoginAccount[]>`
    SELECT id, username, "passwordHash", "failedLoginCount", "lockedUntil"
    FROM "AdminUser" WHERE username = ${username} FOR UPDATE`;
  return rows[0] ?? null;
}

/** Compte un échec ; rend l'instant de fin du verrou s'il vient d'en poser un. */
export async function recordLoginFailure(tx: Tx, account: LoginAccount): Promise<Date | null> {
  const failures = account.failedLoginCount + 1;
  const minutes = lockMinutesAfter(failures);
  const lockedUntil = minutes === null ? null : new Date(tx.now.getTime() + minutes * 60_000);
  await tx.db.adminUser.update({
    where: { id: account.id },
    data: { failedLoginCount: failures, lockedUntil },
  });
  return lockedUntil;
}

export async function recordLoginSuccess(tx: Tx, account: LoginAccount): Promise<void> {
  if (account.failedLoginCount === 0 && account.lockedUntil === null) return;
  await tx.db.adminUser.update({
    where: { id: account.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

/** Crée le compte ou en remplace le mot de passe, verrou levé (CLI, 04 §7.3). */
export async function upsertAccount(tx: Tx, input: { username: string; passwordHash: string }) {
  return tx.db.adminUser.upsert({
    where: { username: input.username },
    create: { username: input.username, passwordHash: input.passwordHash },
    update: { passwordHash: input.passwordHash, failedLoginCount: 0, lockedUntil: null },
    select: { id: true, username: true },
  });
}
