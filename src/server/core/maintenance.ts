import "server-only";
import type { ActionResult } from "@/contracts/result";

/**
 * Mode maintenance de la gestion (07 §1.4 L2, amendement A-11) : `NUREA_GESTION_MAINTENANCE=1` fige
 * la gestion le jour de la bascule, sans rebuild ni lecture en base. La vitrine n'est pas concernée.
 *
 * La page est servie depuis cette constante et non lue sur le disque : sur Vercel, le proxy ne
 * voit pas `public/`. `public/admin-maintenance.html` en est la copie exacte, joignable en direct
 * (`tests/architecture/maintenance-page.test.ts` vérifie l'égalité et l'autonomie).
 */

export const MAINTENANCE_MESSAGE = "Nuréa Gestion est en maintenance. Reviens dans un moment.";

export const MAINTENANCE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#F2F2F7">
<title>Maintenance — Nuréa Gestion</title>
<style>
  html, body { margin: 0; min-height: 100%; background: #F2F2F7; color: #1C1C1E; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
    box-sizing: border-box;
  }
  main { width: 100%; max-width: 420px; background: #FFFFFF; border-radius: 16px; padding: 28px 24px; text-align: center; }
  h1 { margin: 0 0 12px; font-size: 22px; line-height: 1.25; color: #7B0B1D; }
  p { margin: 0 0 24px; font-size: 17px; line-height: 1.45; color: #3A3A3C; }
  button {
    min-height: 44px; min-width: 44px; padding: 12px 20px; border: 0; border-radius: 12px;
    background: #7B0B1D; color: #FFFFFF; font: inherit; font-size: 17px; font-weight: 600; cursor: pointer;
  }
  button:focus-visible { outline: 3px solid #7B0B1D; outline-offset: 3px; }
</style>
</head>
<body>
<main>
<h1>En maintenance</h1>
<p>${MAINTENANCE_MESSAGE}</p>
<button type="button" onclick="location.reload()">Réessayer</button>
</main>
</body>
</html>
`;

const NO_STORE = { "Cache-Control": "no-store", "Retry-After": "300" };

/** 503 : page autonome pour `/admin/*`, `ActionResult` JSON pour `/api/admin/*`. */
export function maintenanceResponse(pathname: string): Response {
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    const body: ActionResult<never> = {
      ok: false,
      error: { code: "UNAVAILABLE", message: MAINTENANCE_MESSAGE, retryable: true },
    };
    return Response.json(body, { status: 503, headers: NO_STORE });
  }
  return new Response(MAINTENANCE_HTML, {
    status: 503,
    headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" },
  });
}
