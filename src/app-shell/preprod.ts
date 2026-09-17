/**
 * La préproduction se reconnaît au premier coup d'œil (07 §1.3, garde-fou 6 ; amendement A-11).
 *
 * `NUREA_ENV=preprod` (variables Vercel *Preview*) : bandeau fixe non fermable dans l'app et nom
 * du manifeste suffixé. Le gérant ne doit jamais saisir une vraie vente en préproduction ; s'il
 * l'installe sur son écran d'accueil, l'icône le dit. Hors préproduction : rien.
 *
 * Lu côté serveur seulement (la variable n'est pas `NEXT_PUBLIC_`) : le layout et le manifeste
 * passent le résultat aux composants.
 */

export const PREPROD_BANNER_TEXT = "Essai — ces données seront effacées";
export const PREPROD_NAME_SUFFIX = " (essai)";

export function isPreprod(env: Record<string, string | undefined> = process.env): boolean {
  return env.NUREA_ENV?.trim() === "preprod";
}
