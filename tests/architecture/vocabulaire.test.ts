import { describe, expect, it } from "vitest";
import { isTestFile, jsxTexts, listSources, read, stringLiterals } from "./support/sources";

/**
 * Invariant de vocabulaire vérifié par une machine (docs/refonte/07-PLAN-EXECUTION.md J3, 04 §1.1,
 * 02 §6, 06 §1.7) : aucun texte d'écran de la gestion ne porte un terme banni. Portée : chaînes
 * littérales et texte JSX de `src/features`, `src/ui`, `src/app-shell` et `src/server/export`, hors
 * fichiers de test (qui citent les termes pour vérifier leur absence).
 */

const SCOPE = ["src/features", "src/ui", "src/app-shell", "src/server/export"];
/** Messages du serveur et des contrats, affichés tels quels : seuls les termes `uiOnly` y sont cherchés. */
const MESSAGE_SCOPE = ["src/server", "src/contracts"];

/**
 * `uiOnly` : le mot est aussi un nom de code (`kind: "document"`, `@/features/documents`) ; seul le TEXTE
 * D'ÉCRAN est visé — texte JSX, ou chaîne qui a l'air d'une phrase (une espace, ou une majuscule en tête)
 * et rien d'un code (chemin, attribut, appel).
 */
type Term = { term: string; caseSensitive?: true; uiOnly?: true; instead: string };

const FORBIDDEN: Term[] = [
  // Sensible à la casse : « ça » et « ca » ne sont pas visés.
  { term: "CA", caseSensitive: true, instead: "Encaissé" },
  { term: "chiffre d'affaires", instead: "Encaissé" },
  { term: "bénéfice", instead: "Marge nette" },
  { term: "panier moyen", instead: "rien : ce chiffre n'existe pas (02 §6)" },
  { term: "prévision", instead: "rien : ce chiffre n'existe pas (02 §6)" },
  { term: "Saisie libre", instead: "Hors catalogue" },
  { term: "Anonyme", instead: "Client de passage" },
  { term: "Client inconnu", instead: "Client de passage" },
  { term: "À traiter", instead: "Confirmée, ou le groupe de liste concerné" },
  { term: "Maison", instead: "Marque" },
  { term: "Galerie", instead: "Catalogue" },
  { term: "Sillage", instead: "Parfum" },
  // Gérant, 25/10/2026 : personne ne dit « document » pour une vente. Le mot reste dans le code.
  { term: "document", uiOnly: true, instead: "vente, commande, ou « ventes et commandes »" },
  { term: "documents", uiOnly: true, instead: "ventes, commandes, ou « ventes et commandes »" },
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mot entier au sens Unicode : « Maisons » et « CAB » ne sont pas « Maison » et « CA ». */
const MATCHERS = FORBIDDEN.map(({ term, caseSensitive, uiOnly, instead }) => ({
  term,
  instead,
  uiOnly: uiOnly === true,
  regex: new RegExp(
    `(?<![\\p{L}\\p{N}_])${escape(term).replace(/ /g, "\\s+")}(?![\\p{L}\\p{N}_])`,
    caseSensitive ? "u" : "iu",
  ),
}));

/** Apostrophe typographique et espaces insécables ramenées à leur forme simple. */
const normalize = (text: string) => text.replace(/[’ʼ]/g, "'").replace(/[  ]/g, " ");

/** Une chaîne qui se lit comme un texte d'écran, pas comme un nom de code. */
const CODE_LIKE = /[@/=(){};<>]|\bdocuments?\.\w|^data-/u;
const looksLikeUiText = (text: string) => (/\s/u.test(text) || /^\p{Lu}/u.test(text.trim())) && !CODE_LIKE.test(text);

function vocabularyViolations(file: string, source: string, o: { uiOnly?: boolean } = {}): string[] {
  const texts = [...stringLiterals(source), ...(file.endsWith("x") ? jsxTexts(source) : [])].map(normalize);
  const found: string[] = [];
  for (const text of texts) {
    for (const { term, instead, regex, uiOnly } of MATCHERS) {
      if (o.uiOnly && !uiOnly) continue;
      if (uiOnly && !looksLikeUiText(text)) continue;
      if (regex.test(text)) found.push(`${file} : « ${text.trim().slice(0, 80)} » contient « ${term} » — dire « ${instead} »`);
    }
  }
  return found;
}

describe("vocabulaire d'écran (07 J3)", () => {
  it("aucun terme interdit dans les textes de la gestion", () => {
    const files = listSources(...SCOPE).filter((file) => !isTestFile(file));
    expect(files.flatMap((file) => vocabularyViolations(file, read(file)))).toEqual([]);
  });

  it("aucun « document » dans les messages du serveur et des contrats", () => {
    const inScope = new Set(listSources(...SCOPE));
    const files = listSources(...MESSAGE_SCOPE).filter((file) => !isTestFile(file) && !inScope.has(file));
    expect(files.flatMap((file) => vocabularyViolations(file, read(file), { uiOnly: true }))).toEqual([]);
  });

  it("le contrôle trouve les termes en chaîne, en gabarit et en JSX, et épargne « ça » et les mots plus longs", () => {
    const source = [
      'const a = "Le CA du mois";',
      "const b = `Client ${name} · client inconnu`;",
      "const c = <p>Notre maison</p>;",
      "const d = <Badge>{count} à traiter</Badge>;",
      "const e = 'Chiffre d’affaires';",
      'const ok = ["ça marche", "Maisons", "CAB", "Ca va", "Encaissé"];',
      "// Anonyme dans un commentaire",
      "const re = /Galerie/;",
    ].join("\n");
    expect(vocabularyViolations("src/features/x/components/X.tsx", source).map((v) => v.split(" contient ")[1])).toEqual([
      "« CA » — dire « Encaissé »",
      "« Client inconnu » — dire « Client de passage »",
      "« chiffre d'affaires » — dire « Encaissé »",
      "« Maison » — dire « Marque »",
      "« À traiter » — dire « Confirmée, ou le groupe de liste concerné »",
    ]);
  });

  it("« document » : visé dans le texte d'écran, épargné dans le code", () => {
    const source = [
      'const a = "Aucun document à rattacher.";',
      'const b = <h2>Documents</h2>;',
      'const c = `${n} documents`;',
      'const ok = ["document", "@/features/documents", "./document-model", "data-day-document=", "Ventes et commandes"];',
      'const ok2 = "document.querySelector(x)";',
    ].join("\n");
    expect(vocabularyViolations("src/features/x/components/X.tsx", source).map((v) => v.split(" contient ")[1]?.split(" — ")[0])).toEqual([
      "« document »",
      "« documents »",
      "« documents »",
    ]);
  });
});
