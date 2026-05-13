/**
 * Si Prisma échoue (réseau, DB down), on évite de marteler la connexion à chaque requête
 * et on limite le bruit dans les logs. Après un succès catalogue, le circuit se réouvre.
 */
let coolUntil = 0;

const DEFAULT_COOL_MS = 90_000;

export function prismaCatalogInCooldown(): boolean {
  return Date.now() < coolUntil;
}

export function registerPrismaCatalogFailure(coolMs = DEFAULT_COOL_MS): void {
  const until = Date.now() + coolMs;
  if (until > coolUntil) {
    coolUntil = until;
    console.warn(
      `[prisma] Catalogue / cache DB indisponible — repli mock & cache mémoire ~${Math.round(coolMs / 1000)}s`
    );
  }
}

export function registerPrismaCatalogSuccess(): void {
  coolUntil = 0;
}

/** Tests uniquement */
export function resetPrismaCatalogCircuitForTests(): void {
  coolUntil = 0;
}
