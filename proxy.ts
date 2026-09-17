import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  renewIfStale,
  sessionCookieOptions,
  verifySessionToken,
} from "@/server/auth/token";
import { maintenanceResponse } from "@/server/core/maintenance";
import { ConfigurationError, isGestionInMaintenance } from "@/server/env";

/**
 * Garde optimiste de la gestion (04 §8.3), convention Next 16. La garde d'autorité reste
 * `requireSession`, appelée par construction dans chaque action, lecture et route.
 *
 * - `NUREA_GESTION_MAINTENANCE=1` : 503 pour toute la gestion, sans lecture en base (07 §1.4, A-11).
 * - `/api/admin/*` : jamais redirigé, la route répond elle-même en JSON (401 `SESSION_EXPIRED`).
 * - Un appel d'action n'est jamais redirigé : `defineAction` répond `SESSION_EXPIRED` proprement.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isGestionInMaintenance()) return maintenanceResponse(pathname);
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) return NextResponse.next();

  // Le root layout applique le registre admin sur cet en-tête (CLAUDE.md, registres disjoints).
  const headers = new Headers(request.headers);
  headers.set("x-nurea-admin-route", "1");
  const pass = () => NextResponse.next({ request: { headers } });

  if (pathname === "/admin/login") return pass();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session: Awaited<ReturnType<typeof verifySessionToken>> = null;
  try {
    session = token ? await verifySessionToken(token) : null;
  } catch (e) {
    if (e instanceof ConfigurationError) {
      return new NextResponse(e.message, { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    throw e;
  }

  if (!session) {
    if (request.headers.has("next-action")) return pass();
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("retour", pathname + search);
    return NextResponse.redirect(login);
  }

  const response = pass();
  const renewed = await renewIfStale(session);
  if (renewed) response.cookies.set(SESSION_COOKIE, renewed, sessionCookieOptions());
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
