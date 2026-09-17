import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "nurea_admin";

/**
 * Gel de la gestion pendant une bascule de données : aucune lecture en base,
 * aucune redirection, pour que rien ne puisse écrire pendant la fenêtre.
 * La vitrine n'est pas concernée.
 */
const MAINTENANCE_HTML = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Nuréa Gestion — maintenance</title>
<style>html,body{margin:0;height:100%;background:#F2F2F7;color:#111114;font:17px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}
h1{font-size:22px;margin:0 0 8px}p{margin:0;color:#5F5862}</style></head>
<body><main><h1>Nuréa Gestion est en maintenance.</h1><p>Reviens dans un moment.</p></main></body></html>`;

function maintenanceResponse(pathname: string) {
  const headers = { "Cache-Control": "no-store", "Retry-After": "300" };
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "Nuréa Gestion est en maintenance. Reviens dans un moment." },
      { status: 503, headers },
    );
  }
  return new NextResponse(MAINTENANCE_HTML, {
    status: 503,
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

function withAdminRouteHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nurea-admin-route", "1");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");

  if (process.env.NUREA_GESTION_MAINTENANCE === "1" && (isAdminPage || isAdminApi)) {
    return maintenanceResponse(pathname);
  }
  if (!isAdminPage) {
    return NextResponse.next();
  }
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return withAdminRouteHeader(request);
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Le contrôle JWT strict est fait côté API admin (requireAdmin + verifyAdminToken).
  // Le middleware garde uniquement la barrière de présence de session pour éviter
  // les faux positifs de configuration edge.
  return withAdminRouteHeader(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
