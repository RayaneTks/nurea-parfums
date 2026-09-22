import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * L'unité de travail d'une action : les modèles Prisma écrits pendant qu'elle s'exécute (04 §10.2).
 * `defineAction` l'ouvre, l'extension de `client.ts` y inscrit chaque écriture — transaction
 * interactive comprise, ce que `tests/db/invalidation.test.ts` vérifie (V-lib-1) — et le `finally`
 * de `defineAction` en déduit les tags à invalider.
 */

const storage = new AsyncLocalStorage<Set<string>>();

export function runUnitOfWork<T>(written: Set<string>, work: () => Promise<T>): Promise<T> {
  return storage.run(written, work);
}

/**
 * Hors unité de travail (script, test, lecture), ne fait rien. Une écriture imbriquée
 * (`create({ data: { lines: { create } } })`) n'inscrit que le modèle de tête : aucun writer ne mêle
 * en une requête un modèle du catalogue et un modèle de gestion, les deux familles de tags de
 * `tags.ts` restent donc justes.
 */
export function recordWrite(model: string | undefined): void {
  if (model) storage.getStore()?.add(model);
}

/** Modèles déjà écrits dans l'unité de travail courante (diagnostic et tests). */
export function writtenModels(): ReadonlySet<string> | undefined {
  return storage.getStore();
}
