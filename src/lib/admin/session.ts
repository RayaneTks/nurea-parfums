import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@prisma/client";

export const ADMIN_COOKIE = "nurea_admin";

export type AdminJwtPayload = {
  sub: string;
  username: string;
  role: AdminRole;
};

function getSecret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET?.trim();
  if (!s || s.length < 24) {
    throw new Error("ADMIN_JWT_SECRET manquant ou trop court (min. 24 caractères).");
  }
  return new TextEncoder().encode(s);
}

export async function signAdminToken(payload: AdminJwtPayload): Promise<string> {
  return new SignJWT({
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const username = payload.username as string | undefined;
    const role = payload.role as AdminJwtPayload["role"] | undefined;
    if (!sub || !username || !role) return null;
    return { sub, username, role };
  } catch {
    return null;
  }
}

export function adminCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
