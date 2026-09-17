import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SessionExpired, requireSession } from "@/server/auth/session";

/**
 * La seule fabrique de lecture serveur (04 §8.4) : session exigée, déduplication par rendu
 * (`react.cache`). Chaque export de `queries.ts` et de `chiffres/index.ts` en sort (test
 * `queries-defined`). Les arguments sont des primitives, pour que `cache` déduplique.
 */
export function defineQuery<A extends readonly unknown[], R>(fn: (...args: A) => Promise<R>) {
  return cache(async (...args: A): Promise<R> => {
    try {
      await requireSession();
    } catch (e) {
      if (e instanceof SessionExpired) redirect("/admin/login");
      throw e;
    }
    return fn(...args);
  });
}
