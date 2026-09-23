import "server-only";
import { headers } from "next/headers";
import { DomainError } from "@/domain/errors";
import { createRateLimiter, rateLimitKey } from "@/lib/security/rate-limit";

/**
 * Frein de connexion par adresse, en plus du verrou par compte (04 §8.6).
 *
 * Pourquoi les deux : le verrou de `authWriter` protège UN compte. Il ne voit rien d'un essai sur
 * dix identifiants différents, ni du martèlement d'un identifiant inexistant — qui ne verrouille
 * rien, puisqu'il n'y a pas de compte à verrouiller. Vingt essais par quart d'heure et par adresse
 * ferment cette porte. L'opérateur est seul et se trompe deux fois, pas vingt.
 *
 * Pourquoi un fichier à part plutôt que dans `actions.ts` : un module `"use server"` ne peut
 * exporter que des fonctions asynchrones, donc pas la remise à zéro dont les tests ont besoin. Et
 * ils en ont besoin : le compteur vit dans le processus, pas dans la base que chaque test vide.
 */
const loginLimiter = createRateLimiter({ limit: 20, windowMs: 15 * 60_000 });

/** Lève `CONFLICT` quand l'adresse a épuisé ses essais. Appelé AVANT toute lecture en base. */
export async function assertLoginAllowed(): Promise<void> {
  const quota = loginLimiter.check(rateLimitKey("login", await headers()));
  if (quota.ok) return;
  const minutes = Math.max(1, Math.ceil(quota.retryAfterSeconds / 60));
  throw new DomainError("CONFLICT", `Trop d'essais. Réessaie dans ${minutes} min.`);
}

/** Remise à zéro entre deux tests. Sans elle, une suite qui enchaîne les connexions se bloque elle-même. */
export function resetLoginThrottle(): void {
  loginLimiter.reset();
}
