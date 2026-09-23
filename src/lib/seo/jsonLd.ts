/**
 * Sérialise un graphe JSON-LD pour l'insérer dans un `<script type="application/ld+json">`.
 *
 * Pourquoi pas `JSON.stringify` tout court : à l'intérieur d'un `<script>`, l'analyseur HTML
 * s'arrête à la première séquence `</script`, où qu'elle apparaisse — y compris au milieu d'une
 * chaîne JSON. Un nom de parfum ou une réponse de FAQ qui contiendrait cette suite refermerait la
 * balise et ferait passer le reste pour du balisage : c'est la forme la plus discrète d'une
 * injection dans une page. Les données viennent aujourd'hui du catalogue, saisies par l'opérateur ;
 * la règle n'en dépend pas, et coûte une ligne.
 *
 * Les deux séparateurs de ligne Unicode sont échappés pour la même raison : JavaScript les lit
 * comme des fins de ligne là où JSON les tient pour des caractères ordinaires. Ils sont désignés
 * par `RegExp` plutôt qu'écrits dans un littéral : un séparateur de ligne DANS une expression
 * régulière littérale la couperait en deux.
 */
const DANGEREUX = new RegExp("[<>&\\u2028\\u2029]", "g");

const ECHAPPES = new Map([
  ["<", "\\u003c"],
  [">", "\\u003e"],
  ["&", "\\u0026"],
  [" ", "\\u2028"],
  [" ", "\\u2029"],
]);

export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(DANGEREUX, (caractere) => ECHAPPES.get(caractere) ?? caractere);
}
