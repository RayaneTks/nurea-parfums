import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Lecture des sources pour les tests d'architecture (04 §16.2) : glob maison et expressions
 * régulières, sans dépendance. Les chemins manipulés sont relatifs à la racine, en `/`.
 */

export const ROOT = path.resolve(__dirname, "../../..");

const SOURCE_EXTENSIONS = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

export function exists(relative: string): boolean {
  return existsSync(path.join(ROOT, relative));
}

/** Fichiers sources sous ces dossiers (ou fichiers), hors `node_modules` et dossiers cachés. */
export function listSources(...entries: string[]): string[] {
  const out: string[] = [];
  const walk = (absolute: string) => {
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      for (const name of readdirSync(absolute)) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        walk(path.join(absolute, name));
      }
    } else if (SOURCE_EXTENSIONS.test(absolute)) {
      out.push(path.relative(ROOT, absolute).split(path.sep).join("/"));
    }
  };
  for (const entry of entries) {
    const absolute = path.join(ROOT, entry);
    if (existsSync(absolute)) walk(absolute);
  }
  return out.sort();
}

export function isTestFile(file: string): boolean {
  return /(^|\/)__tests__\//.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}

/** Contenu du fichier, fins de ligne normalisées (dépôt Windows en `autocrlf`). */
export function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8").replace(/\r\n/g, "\n");
}

const REGEX_PRECEDERS = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "~", "^"]);

/** Hors littéral, en mode `literal-mask` : sépare deux chaînes sans jamais former un mot. */
const MASK = "";

type LexMode = "comments" | "literals" | "literal-mask";

/**
 * Un lexeur minimal, qui ne décale jamais les lignes :
 * - `comments` : commentaires remplacés par des espaces ;
 * - `literals` : commentaires et contenu des chaînes, gabarits et expressions régulières effacés ;
 * - `literal-mask` : l'inverse, seul le contenu des chaînes et gabarits reste.
 * Une chaîne simple s'arrête au retour ligne, ce qui borne à une ligne l'effet d'une apostrophe de
 * texte JSX.
 */
function lex(source: string, mode: LexMode): string {
  const out: string[] = [];
  const templateBraces: number[] = [];
  const n = source.length;
  const masked = mode === "literal-mask";
  /** Caractère effacé (commentaire, ou littéral en mode `literals`). */
  const blank = (ch: string) => (ch === "\n" ? "\n" : masked ? MASK : " ");
  /** Caractère de code : gardé, sauf en mode `literal-mask`. */
  const code = (text: string) => out.push(masked ? text.replace(/[^\n]/g, MASK) : text);
  /** Contenu d'une chaîne ou d'un gabarit. */
  const literal = (ch: string) => (mode === "literals" ? blank(ch) : ch);
  /** Contenu d'une expression régulière : jamais du texte d'écran. */
  const pattern = (ch: string) => (mode === "comments" ? ch : blank(ch));
  let inTemplate = false;
  let prev = "";
  let prev2 = "";
  let i = 0;
  const significant = (ch: string) => {
    prev2 = prev;
    prev = ch;
  };

  while (i < n) {
    const ch = source[i] as string;
    const next = source[i + 1];

    if (inTemplate) {
      if (ch === "\\" && next !== undefined) {
        out.push(literal(ch), literal(next));
        i += 2;
      } else if (ch === "`") {
        code(ch);
        inTemplate = false;
        significant(ch);
        i += 1;
      } else if (ch === "$" && next === "{") {
        code("${");
        templateBraces.push(0);
        inTemplate = false;
        significant("{");
        i += 2;
      } else {
        out.push(literal(ch));
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      while (i < n && source[i] !== "\n") {
        out.push(blank(" "));
        i += 1;
      }
      continue;
    }
    if (ch === "/" && next === "*") {
      out.push(blank(" "), blank(" "));
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        out.push(blank(source[i] as string));
        i += 1;
      }
      if (i < n) {
        out.push(blank(" "), blank(" "));
        i += 2;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      code(ch);
      i += 1;
      while (i < n && source[i] !== ch && source[i] !== "\n") {
        if (source[i] === "\\" && i + 1 < n && source[i + 1] !== "\n") {
          out.push(literal("\\"), literal(source[i + 1] as string));
          i += 2;
        } else {
          out.push(literal(source[i] as string));
          i += 1;
        }
      }
      if (source[i] === ch) {
        code(ch);
        i += 1;
      }
      significant(ch);
      continue;
    }
    if (ch === "`") {
      code(ch);
      inTemplate = true;
      i += 1;
      continue;
    }
    if (ch === "/" && (REGEX_PRECEDERS.has(prev) || (prev === ">" && prev2 === "="))) {
      code(ch);
      i += 1;
      let inClass = false;
      while (i < n && source[i] !== "\n") {
        const c = source[i] as string;
        if (c === "\\" && i + 1 < n) {
          out.push(pattern(c), pattern(source[i + 1] as string));
          i += 2;
          continue;
        }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) break;
        out.push(pattern(c));
        i += 1;
      }
      if (source[i] === "/") {
        code("/");
        i += 1;
      }
      significant("/");
      continue;
    }
    if (ch === "{" && templateBraces.length > 0) {
      templateBraces[templateBraces.length - 1] = (templateBraces.at(-1) as number) + 1;
    } else if (ch === "}" && templateBraces.length > 0) {
      if (templateBraces.at(-1) === 0) {
        templateBraces.pop();
        code(ch);
        inTemplate = true;
        i += 1;
        continue;
      }
      templateBraces[templateBraces.length - 1] = (templateBraces.at(-1) as number) - 1;
    }
    code(ch);
    if (!/\s/.test(ch)) significant(ch);
    i += 1;
  }
  return out.join("");
}

export const stripComments = (source: string) => lex(source, "comments");
export const stripCommentsAndLiterals = (source: string) => lex(source, "literals");

/**
 * Contenu des chaînes et des parties fixes des gabarits, une entrée par littéral (une partie de
 * gabarit coupée par une interpolation compte pour deux). Commentaires et expressions régulières exclus.
 */
export function stringLiterals(source: string): string[] {
  return lex(source, "literal-mask")
    .split(new RegExp(`[${MASK}\n]+`))
    .filter((text) => text.trim() !== "");
}

/**
 * Texte JSX entre deux balises ou autour d'une expression (`<p>Texte</p>`, `>Texte {x}`), lu sur le
 * code sans chaînes ni commentaires. Approximation par expression régulière, suffisante pour y
 * chercher des mots.
 */
export function jsxTexts(source: string): string[] {
  const code = stripCommentsAndLiterals(source);
  return [...code.matchAll(/[>}]([^<>{}]+)(?=[<{])/g)]
    .map((match) => (match[1] as string).trim())
    .filter((text) => /\p{L}/u.test(text));
}

export type ImportRef = { specifier: string; typeOnly: boolean };

/**
 * Imports statiques, ré-exports, `import()` et `require()` d'un fichier. Une déclaration statique
 * commence sa ligne : un exemple d'import écrit dans une chaîne (test d'auto-contrôle) n'est pas compté.
 */
export function importsOf(source: string): ImportRef[] {
  const code = stripComments(source);
  const refs: ImportRef[] = [];
  const patterns: { regex: RegExp; typeGroup?: number; specGroup: number }[] = [
    { regex: /^[ \t]*import\s+(type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"'\n]+)["']/gm, typeGroup: 1, specGroup: 2 },
    { regex: /^[ \t]*export\s+(type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s+["']([^"'\n]+)["']/gm, typeGroup: 1, specGroup: 2 },
    { regex: /\bimport\s*\(\s*["']([^"'\n]+)["']\s*\)/g, specGroup: 1 },
    { regex: /\brequire\s*\(\s*["']([^"'\n]+)["']\s*\)/g, specGroup: 1 },
  ];
  for (const { regex, typeGroup, specGroup } of patterns) {
    for (const match of code.matchAll(regex)) {
      refs.push({
        specifier: match[specGroup] as string,
        typeOnly: typeGroup !== undefined && match[typeGroup] !== undefined,
      });
    }
  }
  return refs;
}

/**
 * Cible d'un import : `@/x` → `src/x`, relatif → chemin depuis la racine, paquet → son nom.
 * Sans extension (`src/server/db/client`) ; un `index` final est retiré.
 */
export function resolveImport(fromFile: string, specifier: string): string {
  let target: string;
  if (specifier.startsWith("@/")) target = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith(".")) target = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  else return specifier;
  return target.replace(SOURCE_EXTENSIONS, "").replace(/\/index$/, "");
}

/** Numéro de ligne (1-based) d'une position. */
export function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}
