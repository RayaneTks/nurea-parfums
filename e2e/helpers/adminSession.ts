import { SignJWT } from "jose";
import type { BrowserContext } from "@playwright/test";

/**
 * Pose une vraie session admin dans le contexte navigateur.
 *
 * Les écrans de gestion sont des composants serveur qui interrogent Prisma :
 * mocker les routes d'API ne suffit pas à les rendre. Le jeton est signé avec
 * le secret de l'application, donc lu par le middleware ET par les pages.
 *
 * Retourne `false` si `ADMIN_JWT_SECRET` est absent — au test de se marquer
 * `skip` plutôt que d'échouer sur un problème d'environnement.
 */
export async function installAdminSession(
  context: BrowserContext,
  baseURL: string,
): Promise<boolean> {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret || secret.length < 24) return false;

  const token = await new SignJWT({ username: "e2e", role: "OWNER" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("e2e-layout-invariants")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));

  const { hostname } = new URL(baseURL);
  await context.addCookies([
    { name: "nurea_admin", value: token, domain: hostname, path: "/", httpOnly: true },
  ]);
  return true;
}
