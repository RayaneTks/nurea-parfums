import "server-only";
import { z } from "zod";

/**
 * Variables de la gestion (04 §8.6, §17.1). Validées sans jamais lever au chargement : la vitrine
 * partage le process et ne doit pas tomber pour une variable de la gestion. `instrumentation.ts`
 * journalise les manques au démarrage ; les points d'entrée qui en ont besoin lèvent
 * `ConfigurationError` au moment de s'en servir.
 */

/** Identifiant du déploiement : préfixe des clés de cache, version du service worker (04 §10.3). */
export const BUILD_ID =
  process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local";

export class ConfigurationError extends Error {
  override readonly name = "ConfigurationError";

  constructor(readonly variable: string) {
    super(`Configuration serveur incomplète : ${variable}`);
  }
}

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\/\S+$/, "URL PostgreSQL attendue");

const gestionEnvSchema = z.object({
  ADMIN_JWT_SECRET: z.string().trim().min(24, "au moins 24 caractères"),
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("URL attendue"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "manquante"),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("catalog"),
});

/** Une ligne par variable absente ou invalide — jamais sa valeur. Vide si tout est en ordre. */
export function gestionEnvProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const parsed = gestionEnvSchema.safeParse(env);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => {
    const variable = issue.path.join(".");
    const missing = issue.code === "invalid_type" && issue.received === "undefined";
    return `${variable} : ${missing ? "absente" : issue.message}`;
  });
}

/**
 * Clé de signature des sessions. Rognée comme dans l'existant (`src/lib/admin/session.ts` de
 * `main`) : un jeton émis avant la bascule reste vérifiable avec le même secret.
 */
export function adminJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret || secret.length < 24) throw new ConfigurationError("ADMIN_JWT_SECRET");
  return new TextEncoder().encode(secret);
}

/** `NUREA_GESTION_MAINTENANCE=1` : la gestion répond 503 sans lire la base (07 §1.4, L2). */
export function isGestionInMaintenance(): boolean {
  return process.env.NUREA_GESTION_MAINTENANCE === "1";
}
