import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { SessionExpired } from "@/server/core/errors";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  verifySessionToken,
  type Session,
} from "@/server/auth/token";

/**
 * La session vue du rendu et des actions (04 §8.4). `requireSession` est appelé par construction
 * dans `defineAction`, `defineQuery` et `defineReadRoute` : aucun chemin de lecture ou d'écriture de
 * la gestion ne l'évite.
 */

export type { Session };
export { SessionExpired };

/** Une vérification par rendu, mémoïsée. Lève `ConfigurationError` si le secret manque. */
export const readSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const verified = await verifySessionToken(token);
  return verified ? { userId: verified.userId, username: verified.username } : null;
});

export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (!session) throw new SessionExpired();
  return session;
}

/** Pose le cookie de session (connexion). Réservé aux actions : `cookies().set` n'y est permis qu'ici. */
export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
