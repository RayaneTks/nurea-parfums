/**
 * Contrat de connexion (`loginAction`, 04 §8.5 ; écran E18).
 */
import { z } from "zod";
import "./zod-fr";

/** Accueil de la gestion : destination par défaut après connexion. */
export const ADMIN_HOME = "/admin";

// Base factice : sert seulement à résoudre `retour` comme le ferait le navigateur.
const ORIGIN = "https://nurea.invalid";

/**
 * Destination après connexion, tirée du paramètre `retour` posé par `proxy.ts` ou `useAction`.
 * Accepté : un chemin de la gestion (`/admin`, `/admin/…`, `/admin?…`) sur la même origine.
 * Tout le reste retombe sur l'Accueil, sans erreur — un lien trafiqué ne doit ni bloquer la
 * connexion ni emmener ailleurs (redirection ouverte). La résolution par `URL` couvre les
 * pièges qu'un test de préfixe laisse passer : `//exemple.com`, `/\exemple.com` (le navigateur
 * lit `\` comme `/`), tabulations et retours ligne ignorés, `/admin/../ailleurs`.
 * `/admin/login` est écarté : on reviendrait sur l'écran qu'on vient de quitter.
 */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 2048) return ADMIN_HOME;
  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return ADMIN_HOME;
  }
  if (url.origin !== ORIGIN) return ADMIN_HOME;
  const inAdmin = url.pathname === ADMIN_HOME || url.pathname.startsWith(`${ADMIN_HOME}/`);
  const isLogin = url.pathname === "/admin/login" || url.pathname.startsWith("/admin/login/");
  return inAdmin && !isLogin ? `${url.pathname}${url.search}${url.hash}` : ADMIN_HOME;
}

export const loginInput = z.object({
  /** Normalisé comme à la création du compte : casse et espaces ne font pas échouer. */
  username: z
    .string()
    .trim()
    .min(1, "Saisis ton identifiant.")
    .max(100, "Cet identifiant est trop long : vérifie ta saisie.")
    .transform((v) => v.toLowerCase()),
  // Jamais rogné : un espace fait partie du mot de passe. Plafond : bcrypt n'en lit que 72 octets,
  // inutile de hacher un texte collé par erreur.
  password: z
    .string()
    .min(1, "Saisis ton mot de passe.")
    .max(256, "Ce mot de passe est trop long : vérifie ta saisie."),
  retour: z.string().optional().catch(undefined).transform(safeReturnPath),
});

export type LoginInput = z.input<typeof loginInput>;
export type LoginData = z.output<typeof loginInput>;
