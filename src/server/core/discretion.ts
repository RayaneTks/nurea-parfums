import "server-only";
import { cookies } from "next/headers";
import { DISCRET_COOKIE, estDiscret } from "@/contracts/discretion";

/**
 * Le mode discret de CET appareil, lu au rendu (voir `src/contracts/discretion.ts`).
 *
 * Appelé par le layout de la gestion, qui pose l'attribut sur la racine du shell. Une seule lecture
 * par rendu : la cascade CSS fait tout le reste, aucun écran n'a besoin de connaître le réglage.
 */
export async function estEnModeDiscret(): Promise<boolean> {
  const jar = await cookies();
  return estDiscret(jar.get(DISCRET_COOKIE)?.value);
}
