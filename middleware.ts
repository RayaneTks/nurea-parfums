import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "nurea_admin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Le contrôle JWT strict est fait côté API admin (requireAdmin + verifyAdminToken).
  // Le middleware garde uniquement la barrière de présence de session pour éviter
  // les faux positifs de configuration edge.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
