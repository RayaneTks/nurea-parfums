/**
 * Témoin « une session a déjà été ouverte sur cet appareil » (06 E18, 04 §8.5).
 *
 * Le navigateur supprime un cookie de session expiré : la garde (`proxy.ts`) ne peut pas distinguer
 * une expiration d'une première visite. Ce témoin, posé par le shell dès qu'il s'affiche (donc avec
 * une session valide), le permet : l'écran de connexion dit « Ta session a expiré… » seulement s'il
 * reçoit un `retour` ET ce témoin. Il ne porte aucune donnée : `1`, sur le chemin `/admin`.
 *
 * Il s'efface quand l'écran de connexion s'ouvre sans `retour` (déconnexion, visite directe) : la
 * visite suivante ne parlera pas d'expiration.
 */

export const SESSION_HINT_COOKIE = "nurea_admin_vu";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function write(value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_HINT_COOKIE}=${value}; Path=/admin; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function markSessionHint(): void {
  if (typeof document === "undefined") return;
  if (document.cookie.split("; ").includes(`${SESSION_HINT_COOKIE}=1`)) return;
  write("1", ONE_YEAR_SECONDS);
}

export function clearSessionHint(): void {
  write("", 0);
}

/** Lecture serveur : valeur du cookie telle que la rend `cookies().get(…)?.value`. */
export function hasSessionHint(value: string | undefined): boolean {
  return value === "1";
}

/** Message de l'écran de connexion après une expiration (06 E18, 04 §9.2 `SESSION_EXPIRED`). */
export const SESSION_EXPIRED_MESSAGE = "Ta session a expiré. Reconnecte-toi : ta saisie est gardée.";
