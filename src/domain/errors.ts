/**
 * Les deux exceptions que le domaine et les writers lèvent (04 §9.1).
 * `toActionError` (src/server/core/errors.ts) les convertit en `ActionError` ;
 * toute autre exception y devient `UNEXPECTED`.
 *
 * Le domaine n'importe pas `src/contracts` : les codes sont redéclarés ici, et
 * `src/contracts/__tests__/result.test.ts` vérifie qu'ils restent un sous-ensemble
 * de `ActionErrorCode`.
 */

/** Les seuls codes qu'une règle métier peut produire ; l'indisponibilité et l'imprévu relèvent du serveur. */
export type DomainErrorCode = "VALIDATION" | "NOT_FOUND" | "CONFLICT";

export class DomainError extends Error {
  override readonly name = "DomainError";

  constructor(
    readonly code: DomainErrorCode,
    /** Phrase française complète : ce qui bloque + le geste qui débloque (04 §9.4). */
    message: string,
    /** VALIDATION : chemin du champ fautif (« lines.0.unitPriceEur »), pour placer le message sous le champ. */
    readonly field?: string,
  ) {
    super(message);
  }
}

/**
 * Une réserve non confirmée. Ce n'est pas un refus : l'écran ouvre `ConfirmDialog`
 * avec ces textes et rappelle l'action avec `confirm: true` et le même identifiant.
 */
export class NeedsConfirmation extends Error {
  override readonly name = "NeedsConfirmation";

  constructor(
    /** « Livrer cette commande ? » */
    readonly title: string,
    /** Une phrase par réserve, affichées telles quelles — jamais recopiées dans l'UI. */
    readonly reserves: readonly string[],
    /** « Confirmer », « Continuer »… */
    readonly confirmLabel: string,
  ) {
    super(`${title} ${reserves.join(" ")}`.trim());
  }
}
