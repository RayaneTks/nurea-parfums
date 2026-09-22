import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { adminJwtSecret } from "@/server/env";

/**
 * Jeton de session (04 §8.2). Sans API Next : importé aussi par `proxy.ts`.
 *
 * Compatibilité : le nom du cookie, l'algorithme, le secret et les revendications `sub` et
 * `username` sont ceux de l'existant. Un jeton émis avant la bascule porte en plus `role`, ignoré
 * ici : les sessions en cours survivent à la bascule.
 */

export const SESSION_COOKIE = "nurea_admin";

const DAY_SECONDS = 24 * 60 * 60;
export const SESSION_TTL_SECONDS = 7 * DAY_SECONDS;
/** Au-delà, `proxy.ts` réémet un jeton de 7 jours : ouvrir l'app une fois par semaine suffit. */
export const RENEW_AFTER_SECONDS = DAY_SECONDS;

export type Session = { userId: string; username: string };

export type VerifiedSession = Session & {
  /** `iat` du jeton, en secondes. */
  issuedAt: number;
};

export async function signSessionToken(session: Session): Promise<string> {
  return new SignJWT({ username: session.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(adminJwtSecret());
}

/**
 * Signature, algorithme et expiration vérifiés ; `null` pour tout jeton refusé.
 * Lève `ConfigurationError` si le secret manque : ce n'est pas le jeton qui est en cause.
 */
export async function verifySessionToken(token: string): Promise<VerifiedSession | null> {
  const secret = adminJwtSecret();
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const { sub, username, iat } = payload;
    if (typeof sub !== "string" || sub === "" || typeof username !== "string" || typeof iat !== "number") return null;
    return { userId: sub, username, issuedAt: iat };
  } catch {
    return null;
  }
}

/** Un jeton neuf si celui-ci a plus de 24 h, sinon `null` (renouvellement glissant, 04 §8.2). */
export async function renewIfStale(session: VerifiedSession, nowMs: number = Date.now()): Promise<string | null> {
  if (Math.floor(nowMs / 1000) - session.issuedAt <= RENEW_AFTER_SECONDS) return null;
  return signSessionToken({ userId: session.userId, username: session.username });
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  } as const;
}
