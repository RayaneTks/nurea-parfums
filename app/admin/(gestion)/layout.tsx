import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/app-shell/AdminShell";
import { isPreprod } from "@/app-shell/preprod";
import { routes } from "@/app-shell/routes";
import { PaletteCollectHost } from "@/features/collect/components/PaletteCollectHost";
import { SessionExpired, requireSession } from "@/server/auth/session";
import { estEnModeDiscret } from "@/server/core/discretion";

/**
 * Tout ce qui exige une session (04 §2.1, §8.4) : garde d'autorité en plus de `proxy.ts`, puis la
 * coque. `proxy.ts` a déjà redirigé avec `retour` ; ici, sans le chemin (un layout ne le reçoit
 * pas), la connexion ramène à l'Accueil.
 */
export default async function GestionLayout({ children }: { children: ReactNode }) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof SessionExpired) redirect(routes.connexion());
    throw error;
  }
  // `paletteSheets` : les sheets qu'une action de la recherche globale ouvre sur l'écran courant (06 §4.4,
  // A16). C'est le layout qui les monte — le shell n'importe aucun écran (04 §1.3).
  return (
    <AdminShell preprod={isPreprod()} discret={await estEnModeDiscret()} paletteSheets={<PaletteCollectHost />}>
      {children}
    </AdminShell>
  );
}
