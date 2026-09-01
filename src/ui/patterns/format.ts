/**
 * La mise en forme des nombres, en un seul endroit.
 *
 * Pourquoi ce fichier existe : une vingtaine d'endroits contournaient le
 * composant `Money` avec `toFixed(2) + " €"`. Le résultat tenait dans un même
 * écran de compta :
 *
 *     1 480 €        (Intl, correct)
 *     1025 €         (toFixed(0), sans espace de milliers)
 *     70,00 €        (Intl, avec centimes)
 *     54.5 %         (toFixed(1), point décimal — pas français)
 *
 * Quatre formats côte à côte, sur des chiffres qu'on compare du regard. L'œil
 * ne peut pas balayer une colonne dont les nombres n'ont pas la même forme :
 * il doit lire chaque ligne.
 *
 * Règle : **aucun montant, aucun pourcentage ne se met en forme ailleurs
 * qu'ici.** `Money` s'en sert pour l'affichage ; ces fonctions servent aux
 * endroits où il faut une chaîne — libellés d'accessibilité, messages, valeurs
 * pré-remplies d'un champ.
 */

const AVEC_CENTIMES = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SANS_CENTIMES = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Accepte ce que Prisma et les formulaires renvoient : nombre, chaîne, rien. */
export function nombre(valeur: number | string | null | undefined): number {
  if (valeur === null || valeur === undefined) return 0;
  if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : 0;
  const n = Number(String(valeur).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Un montant en euros.
 *
 * `compact` masque les centimes — utile dans une tuile de chiffre, où deux
 * zéros répétés à chaque ligne coûtent de la largeur sans rien apprendre. Il
 * ne masque JAMAIS des centimes réels : `formateEuros(70.5, true)` rend
 * « 70,50 € », pas « 71 € ». Arrondir un montant qu'on affiche, c'est mentir
 * sur un chiffre que quelqu'un va comparer à sa caisse.
 */
export function formateEuros(
  valeur: number | string | null | undefined,
  options?: { compact?: boolean },
): string {
  const n = nombre(valeur);
  const rond = Math.round(n * 100) % 100 === 0;
  return options?.compact && rond ? SANS_CENTIMES.format(n) : AVEC_CENTIMES.format(n);
}

/**
 * Un pourcentage, à la française : virgule décimale et espace insécable avant
 * le signe. `Intl` pose les deux tout seul, ce que `toFixed` ne fait pas.
 */
export function formatePourcent(valeur: number | null | undefined, decimales = 0): string {
  const n = Number.isFinite(valeur ?? NaN) ? (valeur as number) : 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n / 100);
}

/**
 * La valeur à mettre dans un champ de saisie de montant.
 *
 * Sans symbole ni espace de milliers — un champ pré-rempli « 1 234,56 € » se
 * fait retaper à la main par l'utilisateur, et la virgule française est ce que
 * son clavier propose.
 */
export function pourSaisie(valeur: number | string | null | undefined): string {
  return nombre(valeur).toFixed(2).replace(".", ",");
}
