/**
 * Montants des scripts de migration : des centimes entiers (bigint), jamais de flottant.
 *
 * La base renvoie ses `numeric(…, 2)` en texte (`amount::text` → "12.50", "-3.00") ; on les
 * convertit ici en centimes exacts et on les réécrit en chaînes à deux décimales
 * (docs/refonte/07-PLAN-EXECUTION.md §2.2, déterminisme ; §2.5, tolérance 0,00 €).
 */

const FORMAT = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/** "12.5" → 1250n ; "-0.07" → -7n. Refuse toute écriture qui n'est pas un décimal à ≤ 2 décimales. */
export function centimes(montant: string): bigint {
  const match = FORMAT.exec(montant.trim());
  if (!match) throw new Error(`Montant illisible : « ${montant} » (deux décimales au plus attendues).`);
  const [, signe, entiers, decimales = ""] = match;
  const valeur = BigInt(entiers as string) * 100n + BigInt(decimales.padEnd(2, "0") || "0");
  return signe ? -valeur : valeur;
}

/** 1250n → "12.50" ; -7n → "-0.07" ; 0n → "0.00". */
export function euros(valeur: bigint): string {
  const negatif = valeur < 0n;
  const absolu = negatif ? -valeur : valeur;
  const entiers = absolu / 100n;
  const decimales = (absolu % 100n).toString().padStart(2, "0");
  return `${negatif ? "-" : ""}${entiers.toString()}.${decimales}`;
}

/** Somme de montants textuels, en chaîne à deux décimales. */
export function somme(montants: readonly string[]): string {
  return euros(montants.reduce((acc, m) => acc + centimes(m), 0n));
}

/** Affichage pour le gérant : « 1 069,50 € », « −30,00 € ». */
export function eurosLisibles(montant: string | bigint): string {
  const valeur = typeof montant === "bigint" ? montant : centimes(montant);
  const [entiers, decimales] = euros(valeur < 0n ? -valeur : valeur).split(".") as [string, string];
  const groupes = entiers.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${valeur < 0n ? "−" : ""}${groupes},${decimales} €`;
}
