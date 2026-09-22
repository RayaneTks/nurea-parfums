import "server-only";
import type { NextRequest } from "next/server";
import type { ActionErrorCode, ActionResult } from "@/contracts/result";
import { requireSession } from "@/server/auth/session";
import { toActionError } from "@/server/core/errors";
import { logReadError } from "@/server/core/log";

/**
 * La seule fabrique de route GET de la gestion (04 §3.5) : session exigée (401 + `SESSION_EXPIRED`
 * sinon), corps au format `ActionResult`, `Cache-Control: private` explicite. Un `route.ts` de
 * `/api/admin` n'exporte que `export const GET = defineReadRoute(…)` (test `route-handlers`).
 */

const DEFAULT_CACHE_CONTROL = "private, no-store";

const STATUS: Record<ActionErrorCode, number> = {
  VALIDATION: 400,
  NEEDS_CONFIRMATION: 409,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SESSION_EXPIRED: 401,
  OFFLINE: 503,
  UNAVAILABLE: 503,
  UNEXPECTED: 500,
};

const REPLY = Symbol("reply");

type Reply<T> = { readonly [REPLY]: true; data: T; cacheControl: string };

/** Données accompagnées d'un `Cache-Control` choisi (sélecteur versionné : `immutable`). */
export function reply<T>(data: T, options: { cacheControl: string }): Reply<T> {
  return { [REPLY]: true, data, cacheControl: options.cacheControl };
}

type ReadRouteHandler<T> = (request: NextRequest) => Promise<T | Reply<T> | Response>;

function json<T>(body: ActionResult<T>, status: number, cacheControl: string): Response {
  return Response.json(body, { status, headers: { "Cache-Control": cacheControl } });
}

export function defineReadRoute<T>(name: string, handler: ReadRouteHandler<T>) {
  return async function GET(request: NextRequest): Promise<Response> {
    try {
      await requireSession();
      const out = await handler(request);
      if (out instanceof Response) {
        // Un fichier (export CSV) : jamais mis en cache partagé.
        if (!out.headers.has("Cache-Control")) out.headers.set("Cache-Control", DEFAULT_CACHE_CONTROL);
        return out;
      }
      if (typeof out === "object" && out !== null && REPLY in out) {
        return json({ ok: true, data: out.data }, 200, out.cacheControl);
      }
      return json({ ok: true, data: out as T }, 200, DEFAULT_CACHE_CONTROL);
    } catch (cause) {
      const error = toActionError(cause, "read");
      if (error.code === "UNEXPECTED" || error.code === "UNAVAILABLE") {
        logReadError({ name, cause, reference: error.reference });
      }
      return json({ ok: false, error }, STATUS[error.code], DEFAULT_CACHE_CONTROL);
    }
  };
}
