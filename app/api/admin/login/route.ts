import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { rateLimitLogin } from "@/lib/admin/loginRateLimit";
import { adminCookieOptions, ADMIN_COOKIE, signAdminToken } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  if (!process.env.ADMIN_JWT_SECRET?.trim()) {
    return NextResponse.json(
      { error: "ADMIN_JWT_SECRET non configuré sur le serveur." },
      { status: 503 }
    );
  }

  const ip = clientIp(request);
  if (!rateLimitLogin(ip)) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const username = (body.username ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Identifiant et mot de passe requis." }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) {
      await bcrypt.hash(password, 10);
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    const token = await signAdminToken({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    const res = NextResponse.json({
      ok: true,
      user: { username: user.username, role: user.role },
    });
    res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions(60 * 60 * 24 * 7));
    return res;
  } catch (error) {
    console.error("[admin/login] error:", error);
    return NextResponse.json(
      { error: "Connexion impossible pour le moment. Réessayez." },
      { status: 503 },
    );
  }
}
