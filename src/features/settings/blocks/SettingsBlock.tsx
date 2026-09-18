import { requireSession } from "@/server/auth/session";
import { BUILD_ID } from "@/server/env";
import { getSettings } from "@/server/settings/queries";
import { activePockets } from "@/server/treasury/queries";
import { SettingsView } from "../components/SettingsView";

/**
 * E08 — les réglages du moment, les poches actives (pour la poche par défaut et S21), le compte de la
 * session et l'identifiant de build. Les trois lectures en parallèle ; aucune n'est mise en cache
 * inter-requêtes (un formulaire lit la valeur de l'instant, 04 §10.4).
 */
export async function SettingsBlock() {
  const [settings, pockets, session] = await Promise.all([getSettings(), activePockets(), requireSession()]);
  return <SettingsView settings={settings} pockets={pockets} username={session.username} version={BUILD_ID} />;
}
