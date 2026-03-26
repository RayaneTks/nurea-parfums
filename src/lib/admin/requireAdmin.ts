import { NextResponse } from "next/server";
import type { AdminRole } from "@prisma/client";
import { getCookieValue } from "./parseCookie";
import { ADMIN_COOKIE, verifyAdminToken, type AdminJwtPayload } from "./session";

export type AdminContext = AdminJwtPayload;

export async function requireAdmin(request: Request): Promise<AdminContext | NextResponse> {
  const token = getCookieValue(request.headers.get("cookie"), ADMIN_COOKIE);
  if (!token) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const ctx = await verifyAdminToken(token);
  if (!ctx) {
    return NextResponse.json({ error: "Session invalide ou expirée." }, { status: 401 });
  }
  return ctx;
}

const rank: Record<AdminRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export function canEdit(role: AdminRole): boolean {
  return rank[role] >= rank.EDITOR;
}

export function requireEditor(ctx: AdminContext): NextResponse | null {
  if (!canEdit(ctx.role)) {
    return NextResponse.json({ error: "Droits insuffisants (édition)." }, { status: 403 });
  }
  return null;
}
