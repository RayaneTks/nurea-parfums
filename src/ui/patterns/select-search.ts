/**
 * Recherche insensible aux accents, à la casse et aux ligatures (05 §3.2
 * `SelectSheet`) : « farès » trouve « Fares », « coeur » trouve « Cœur ».
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLocaleLowerCase("fr-FR")
    .replace(/\s+/g, " ")
    .trim();
}

export type Searchable = {
  label: string;
  description?: string;
  /** Termes cherchables non affichés : téléphone normalisé, Snap, marque. */
  keywords?: readonly string[];
};

/**
 * Options dont le texte contient TOUS les mots saisis, dans n'importe quel
 * ordre. Les libellés qui commencent par la saisie passent devant, puis ceux
 * dont un mot commence par elle ; l'ordre d'origine est gardé à égalité.
 */
export function filterOptions<T extends Searchable>(options: readonly T[], query: string): T[] {
  const q = normalizeSearch(query);
  if (q === "") return [...options];
  const tokens = q.split(" ");
  const scored: { option: T; score: number; index: number }[] = [];
  options.forEach((option, index) => {
    const label = normalizeSearch(option.label);
    const haystack = normalizeSearch([option.label, option.description ?? "", ...(option.keywords ?? [])].join(" "));
    if (!tokens.every((t) => haystack.includes(t))) return;
    const score = label.startsWith(q) ? 0 : label.split(" ").some((w) => w.startsWith(tokens[0] ?? "")) ? 1 : 2;
    scored.push({ option, score, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((s) => s.option);
}
