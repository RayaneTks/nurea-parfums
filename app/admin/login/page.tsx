import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPreprod } from "@/app-shell/preprod";
import { SESSION_HINT_COOKIE, hasSessionHint } from "@/app-shell/session-hint";
import { safeReturnPath } from "@/contracts/auth";
import { readSession } from "@/server/auth/session";
import { LoginScreen } from "./LoginScreen";

export const metadata: Metadata = { title: "Connexion" };

/**
 * E18 — Connexion (06 §3.6), hors garde et hors shell. `retour` est lu ici, côté serveur, et passé
 * en props : le formulaire n'a pas besoin de `useSearchParams` (ni de `Suspense`).
 *
 * - Session déjà valide (lien de connexion rouvert, PWA relancée) : directement à destination.
 * - « Ta session a expiré… » : seulement avec un `retour` ET le témoin d'une session passée sur cet
 *   appareil (`session-hint.ts`) — une première visite n'est pas une expiration.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { retour: raw } = await searchParams;
  const retour = typeof raw === "string" && raw !== "" ? raw : undefined;

  // Secret absent : pas de session lisible, le formulaire dira pourquoi la connexion échoue.
  const session = await readSession().catch(() => null);
  if (session) redirect(safeReturnPath(retour));

  const hint = (await cookies()).get(SESSION_HINT_COOKIE)?.value;
  return <LoginScreen retour={retour} expired={retour !== undefined && hasSessionHint(hint)} preprod={isPreprod()} />;
}
