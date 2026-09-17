"use server";
import "server-only";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginInput } from "@/contracts/auth";
import { DomainError } from "@/domain/errors";
import { clearSessionCookie, setSessionCookie } from "@/server/auth/session";
import { signSessionToken } from "@/server/auth/token";
import * as authWriter from "@/server/auth/writer";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";

const INVALID_CREDENTIALS = "Identifiant ou mot de passe incorrect.";

// Hash bcrypt (coût 12, celui de create-admin) d'un secret jeté : un identifiant inconnu coûte le
// même temps qu'un mauvais mot de passe, et ne se devine pas au chronomètre.
const DUMMY_HASH = "$2b$12$Zy4/qopDgM54sHcFWC4xDOA9h.YaLfXb6y17DE5XA3NsQD8rS3WTq";

type Attempt =
  | { kind: "accepted"; userId: string; username: string }
  | { kind: "refused" }
  | { kind: "locked"; minutes: number };

/** Connexion (04 §8.5) : la seule action publique. Rend la destination ; le client y navigue. */
export const loginAction = defineAction(
  "auth.login",
  loginInput,
  async (input) => {
    // L'échec est compté DANS la transaction, le refus levé APRÈS : un ROLLBACK l'effacerait.
    const attempt = await inTransaction(async (tx): Promise<Attempt> => {
      const account = await authWriter.findAccountForLogin(tx, input.username);
      if (!account) {
        await bcrypt.compare(input.password, DUMMY_HASH);
        return { kind: "refused" };
      }
      // Pendant le verrou, un essai n'est ni vérifié ni compté : marteler ne prolonge pas l'attente.
      if (account.lockedUntil && account.lockedUntil > tx.now) {
        return { kind: "locked", minutes: authWriter.remainingLockMinutes(account.lockedUntil, tx.now) };
      }
      if (!(await bcrypt.compare(input.password, account.passwordHash))) {
        const lockedUntil = await authWriter.recordLoginFailure(tx, account);
        return lockedUntil
          ? { kind: "locked", minutes: authWriter.remainingLockMinutes(lockedUntil, tx.now) }
          : { kind: "refused" };
      }
      await authWriter.recordLoginSuccess(tx, account);
      return { kind: "accepted", userId: account.id, username: account.username };
    });

    if (attempt.kind === "refused") throw new DomainError("VALIDATION", INVALID_CREDENTIALS);
    if (attempt.kind === "locked") {
      throw new DomainError("CONFLICT", `Trop d'essais. Réessaie dans ${attempt.minutes} min.`);
    }
    await setSessionCookie(await signSessionToken({ userId: attempt.userId, username: attempt.username }));
    return { destination: input.retour };
  },
  { public: true },
);

/** Déconnexion (écran Réglages) : la seule action qui redirige (04 §3.3). */
export const logoutAction = defineAction("auth.logout", z.void(), async () => {
  await clearSessionCookie();
  redirect("/admin/login");
});
