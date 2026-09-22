import { PREPROD_BANNER_TEXT } from "./preprod";

/**
 * Bandeau de préproduction (07 §1.3, garde-fou 6) : fixe, non fermable, dans le flux au-dessus du
 * header — il ne recouvre jamais le contenu. Rendu par le shell et par l'écran de connexion quand
 * `isPreprod()` est vrai côté serveur.
 */
export function PreprodBanner() {
  return (
    <p
      role="note"
      data-preprod-banner
      className="admin-type-caption w-full shrink-0 bg-[var(--admin-warning)] px-4 py-1 text-center font-semibold text-[var(--admin-on-accent)]"
    >
      {PREPROD_BANNER_TEXT}
    </p>
  );
}
