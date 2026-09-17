import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/app-shell/AdminShell";
import { isPreprod } from "@/app-shell/preprod";
import { routes } from "@/app-shell/routes";
import { SessionExpired, requireSession } from "@/server/auth/session";

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
  return <AdminShell preprod={isPreprod()}>{children}</AdminShell>;
}
