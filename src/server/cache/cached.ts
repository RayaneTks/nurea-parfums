import "server-only";
import { unstable_cache } from "next/cache";
import { parisDayKey } from "@/domain/periods";
import { ADMIN_CATALOGUE_CACHE_TAG, GESTION_TAG, type CacheFamily } from "@/server/cache/tags";
import { BUILD_ID } from "@/server/env";

/**
 * Seul appelant de `unstable_cache` (04 §10.3, test `cache-calls`). Le jour où `"use cache"` sera
 * activé, seul ce fichier change.
 *
 * `cached()` ne lit ni cookie ni en-tête : la session est vérifiée avant, par `defineQuery` qui
 * enveloppe la fonction cachée.
 */

export type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json };

type CacheKeyPart = string | number | null;

/** Filet de sécurité de la famille `gestion` : même une invalidation manquée ne dure pas plus. */
const GESTION_REVALIDATE_SECONDS = 60;

export function cached<A extends readonly CacheKeyPart[], R extends Json>(
  name: string,
  family: CacheFamily,
  fn: (...args: A) => Promise<R>,
  options: { daily?: boolean } = {},
): (...args: A) => Promise<R> {
  return (...args: A): Promise<R> =>
    unstable_cache(
      () => fn(...args),
      // BUILD_ID en tête : un changement de forme du résultat ne sert jamais l'ancienne forme.
      // JSON plutôt que String : `null` et "null" restent deux clés.
      [BUILD_ID, name, ...(options.daily ? [parisDayKey()] : []), ...args.map((arg) => JSON.stringify(arg))],
      {
        tags: family === "gestion" ? [GESTION_TAG] : [ADMIN_CATALOGUE_CACHE_TAG],
        revalidate: family === "gestion" ? GESTION_REVALIDATE_SECONDS : false,
      },
    )();
}
