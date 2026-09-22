import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import type { ActionResult } from "@/contracts/result";
import { requireSession } from "@/server/auth/session";
import { invalidateWrittenModels } from "@/server/cache/invalidate";
import { toActionError, validationError } from "@/server/core/errors";
import { logAction } from "@/server/core/log";
import { runUnitOfWork } from "@/server/db/unit-of-work";

/**
 * La seule fabrique d'action (04 §3.3) : session, validation d'autorité, traduction des erreurs,
 * journal et invalidation déduite des écritures — une fois pour toutes. Un fichier `actions.ts`
 * n'exporte que des constantes produites ici (test `server-actions`).
 */

const NOTICE = Symbol("notice");

type WithNotice<T> = { readonly [NOTICE]: true; data: T; notice: string };

/** Un succès accompagné d'une information (« Cette marque existait déjà : elle a été sélectionnée. »). */
export function withNotice<T>(data: T, notice: string): WithNotice<T> {
  return { [NOTICE]: true, data, notice };
}

function isWithNotice<T>(value: T | WithNotice<T>): value is WithNotice<T> {
  return typeof value === "object" && value !== null && NOTICE in value;
}

type Handler<S extends z.ZodTypeAny, T> = (input: z.output<S>) => Promise<T | WithNotice<T>>;

export function defineAction<S extends z.ZodTypeAny, T>(
  /** « payments.record » : journal et références. */
  name: string,
  schema: S,
  handler: Handler<S, T>,
  /** `public` : `loginAction` seulement (test `server-actions`). */
  options: { public?: true } = {},
): (input: z.input<S>) => Promise<ActionResult<T>> {
  return async function action(raw) {
    const startedAt = Date.now();
    const written = new Set<string>();
    try {
      if (!options.public) await requireSession();
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const error = validationError(parsed.error);
        logAction({ action: name, startedAt, error });
        return { ok: false, error };
      }
      const out = await runUnitOfWork(written, () => handler(parsed.data));
      logAction({ action: name, startedAt });
      return isWithNotice(out) ? { ok: true, data: out.data, notice: out.notice } : { ok: true, data: out };
    } catch (cause) {
      unstable_rethrow(cause); // redirect() et notFound() de Next passent (logoutAction)
      const error = toActionError(cause, "write");
      logAction({ action: name, startedAt, error, cause });
      return { ok: false, error };
    } finally {
      // Après COMMIT comme après ROLLBACK : toujours sûr (04 §10.2).
      invalidateWrittenModels(written);
    }
  };
}
