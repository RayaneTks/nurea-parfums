import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT, listSources, isTestFile, lineOf, read, stripComments } from "./support/sources";

/**
 * Garde-fou « pas de look généré par IA » pour la vitrine (`app/(shop)`, `src/components`).
 *
 * Les tics d'une interface produite en série sont connus et se repèrent à la lecture du code : une
 * police par défaut, un dégradé violet, un texte en dégradé, une bordure latérale colorée, un
 * `transition: all`, un rebond, du noir ou du blanc purs. Ce test les refuse, comme
 * `vocabulaire.test.ts` refuse un terme mort : la règle est dans un test, pas dans la mémoire de
 * celui qui relit.
 *
 * Il ne juge PAS le goût : un site peut passer ce test et rester banal. Il garantit seulement que
 * rien d'aussi reconnaissable que ces tics n'entre sans qu'on l'ait voulu.
 *
 * Dérogation : `slop-ok: <raison>` dans un commentaire sur la même ligne. La raison est
 * obligatoire, et la liste des dérogations est elle-même bornée.
 *
 * Périmètre : la vitrine seulement. La gestion (`src/ui`, `src/features`) a son registre, ses
 * règles et ses propres tests.
 */

const SCOPE = ["app/(shop)", "src/components", "src/design/brand.ts", "src/design/fonts.ts"];
const STYLESHEETS = ["app/globals.css"];

type Rule = {
  id: string;
  /** Ce qu'on refuse, en une phrase. */
  label: string;
  /** Ce qu'il faut faire à la place. */
  instead: string;
  pattern: RegExp;
  /** Emploi technique légitime : la ligne qui le contient n'est pas un tic. */
  ignore?: RegExp;
};

const RULES: readonly Rule[] = [
  {
    id: "transition-all",
    label: "`transition: all` / `transition-all`",
    instead: "nommer les propriétés (`transition-colors`, `transform`, `opacity`)",
    pattern: /transition\s*:\s*all\b|(?<![\w-])transition-all(?![\w-])/,
  },
  {
    id: "police-par-defaut",
    label: "police invisible par défaut (Inter, Roboto, Arial, Open Sans, Lato, Montserrat, Poppins)",
    instead: "une famille choisie pour la marque (voir `src/design/fonts.ts`)",
    pattern: /(?<![\w-])(Inter|Roboto|Open[ _]Sans|Lato|Montserrat|Poppins)(?![\w-])|font-family\s*:[^;{}]*\bArial\b/,
  },
  {
    id: "texte-en-degrade",
    label: "texte en dégradé (`bg-clip-text`, `background-clip: text`)",
    instead: "une couleur pleine ; la hiérarchie vient de la taille, de la graisse et de l'espace",
    pattern: /(?<![\w-])bg-clip-text(?![\w-])|background-clip\s*:\s*text/,
  },
  {
    id: "violet-indigo",
    label: "classes Tailwind violet / indigo / fuchsia",
    instead: "la palette de la marque",
    pattern: /(?<![\w-])(?:[a-z]+:)*(?:from|to|via|bg|text|border|ring|fill|stroke|shadow)-(?:purple|violet|indigo|fuchsia)-\d{2,3}/,
  },
  {
    id: "hauteur-vh",
    label: "`h-screen` / `min-h-screen` / `100vh`",
    instead: "`min-h-[100dvh]` (la barre d'adresse mobile fausse `vh`)",
    pattern: /(?<![\w-])(?:min-|max-)?h-screen(?![\w-])|(?<![\d.])100vh(?![\w])/,
  },
  {
    id: "rebond",
    label: "rebond ou élastique (`animate-bounce`, courbe qui dépasse 1)",
    instead: "une décélération exponentielle (ease-out) ; un ressort seulement sous le doigt",
    pattern: /(?<![\w-])animate-bounce(?![\w-])|cubic-bezier\(\s*-?[\d.]+\s*,\s*(?:-[\d.]+|1\.\d+|[2-9][\d.]*)\s*,|cubic-bezier\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*(?:-[\d.]+|1\.\d+|[2-9][\d.]*)\s*\)/,
  },
  {
    id: "bordure-laterale",
    label: "bordure latérale épaisse en guise d'accent (`border-l-4`…)",
    instead: "de l'espace, un filet complet, ou rien",
    pattern: /(?<![\w-])border-[lr]-(?:2|3|4|8)(?![\w-])|border-[lr]\s*:\s*[3-9]px\s+solid/,
  },
  {
    id: "noir-blanc-purs",
    label: "noir ou blanc purs (`#000`, `#fff`, `bg-black`, `text-white`…)",
    instead: "un neutre teinté de la teinte de la marque (jeton)",
    pattern: /#(?:000|fff)(?![0-9a-fA-F])|#(?:000000|ffffff)(?![0-9a-fA-F])|(?<![\w-])(?:[a-z]+:)*(?:bg|text|border|fill|stroke|ring)-(?:black|white)(?![\w-])/i,
    // Un masque ne lit que l'opacité de ses couleurs : `#000` n'y est jamais affiché.
    ignore: /(?:^|[\s;{])(?:-webkit-)?mask(?:-image)?\s*:/,
  },
  {
    id: "ombre-generique",
    label: "ombre Tailwind d'origine (`shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`)",
    instead: "une ombre nommée dans les jetons, ou un filet",
    pattern: /(?<![\w-])(?:[a-z]+:)*shadow-(?:md|lg|xl|2xl)(?![\w-])/,
  },
  {
    id: "zoom-interdit",
    label: "zoom bloqué (`user-scalable=no`, `maximum-scale=1`)",
    instead: "laisser le zoom : un site qui casse à 200 % se corrige, il ne se verrouille pas",
    pattern: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?![\d.])/,
  },
  {
    id: "taille-en-px",
    label: "taille de texte en `px` dans la feuille de style",
    instead: "`rem`, pour respecter le réglage de l'utilisateur",
    pattern: /font-size\s*:\s*\d+(?:\.\d+)?px/,
  },
];

/** Verre dépoli : un matériau sert une surface (barre, feuille), pas tout un site. */
const BACKDROP_BUDGET = 6;
const BACKDROP = /(?<![\w-])backdrop-blur(?:-[\w[\]./]+)?|backdrop-filter\s*:/g;

const WAIVER = /slop-ok\s*:\s*\S/;
const MAX_WAIVERS = 8;

function stylesheetSources(): string[] {
  const out: string[] = [];
  const walk = (absolute: string) => {
    if (statSync(absolute).isDirectory()) {
      for (const name of readdirSync(absolute)) if (!name.startsWith(".") && name !== "node_modules") walk(path.join(absolute, name));
    } else if (/\.css$/.test(absolute)) out.push(path.relative(ROOT, absolute).split(path.sep).join("/"));
  };
  for (const entry of STYLESHEETS) walk(path.join(ROOT, entry));
  return out;
}

const files = [...listSources(...SCOPE).filter((file) => !isTestFile(file)), ...stylesheetSources()];

type Hit = { file: string; line: number; rule: Rule; text: string };

function scan(file: string, source: string): { hits: Hit[]; waived: number } {
  const raw = source.split("\n");
  // Le test est écrit sur le code, pas sur ses commentaires (qui expliquent ce qu'on évite).
  const code = stripComments(source).split("\n");
  const hits: Hit[] = [];
  let waived = 0;
  code.forEach((text, index) => {
    for (const rule of RULES) {
      if (!rule.pattern.test(text) || rule.ignore?.test(text)) continue;
      if (WAIVER.test(raw[index] ?? "")) {
        waived += 1;
        continue;
      }
      hits.push({ file, line: index + 1, rule, text: text.trim().slice(0, 100) });
    }
  });
  return { hits, waived };
}

const sources = new Map(files.map((file) => [file, read(file)]));

describe("anti-slop : la vitrine n'a aucun des tics d'une interface générée en série", () => {
  it("le périmètre n'est pas vide (un test qui ne lit rien ne garantit rien)", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain("app/globals.css");
  });

  for (const rule of RULES) {
    it(`pas de ${rule.label}`, () => {
      const found = [...sources].flatMap(([file, source]) => scan(file, source).hits.filter((hit) => hit.rule.id === rule.id));
      const report = found.map((hit) => `  ${hit.file}:${hit.line}  ${hit.text}`).join("\n");
      expect(found, `${rule.label} — à la place : ${rule.instead}\n${report}`).toEqual([]);
    });
  }

  it(`le verre dépoli reste un matériau rare (${BACKDROP_BUDGET} emplois au plus)`, () => {
    const uses = [...sources].flatMap(([file, source]) => {
      const code = stripComments(source);
      return [...code.matchAll(BACKDROP)].map((match) => `${file}:${lineOf(code, match.index ?? 0)}`);
    });
    expect(uses.length, `emplois :\n  ${uses.join("\n  ")}`).toBeLessThanOrEqual(BACKDROP_BUDGET);
  });

  it(`les dérogations (« slop-ok: raison ») sont rares (${MAX_WAIVERS} au plus) et toutes motivées`, () => {
    const total = [...sources].reduce((sum, [file, source]) => sum + scan(file, source).waived, 0);
    expect(total).toBeLessThanOrEqual(MAX_WAIVERS);
    const bare = [...sources].flatMap(([file, source]) =>
      source.split("\n").flatMap((text, index) => (/slop-ok\b/.test(text) && !WAIVER.test(text) ? [`${file}:${index + 1}`] : [])),
    );
    expect(bare, "dérogation sans raison").toEqual([]);
  });
});
