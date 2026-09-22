import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colors, cssVariables, runtimeVariables, typography, zIndex } from "@/design/tokens";

/**
 * `src/design/tokens.ts` est la source unique ; `globals.admin.css` en est
 * dérivée (docs/refonte/05-DESIGN-SYSTEM.md §2). Ce test est la garantie :
 * la divergence de `--admin-text-subtle` (corrigé dans la CSS, oublié dans
 * tokens.ts) ne peut plus se reproduire.
 */

const ROOT = path.resolve(__dirname, "../..");
const CSS_PATH = path.join(ROOT, "src/design/globals.admin.css");

const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const stripJsComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

/** Casse et blancs seulement : une valeur réécrite (0.3 pour 0.30) est une divergence. */
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");

const css = stripCssComments(readFileSync(CSS_PATH, "utf8"));
const expected = cssVariables();
const runtime = new Set<string>(runtimeVariables);

/** Toutes les déclarations `--admin-*: valeur;` de la feuille, dans l'ordre. */
const declarations = [...css.matchAll(/(--admin-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => ({
  name: m[1] as string,
  value: m[2] as string,
}));

function sourceFiles(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      out.push(...sourceFiles(full, ext));
    } else if (ext.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");
const uiFiles = sourceFiles(path.join(ROOT, "src/ui"), /\.(ts|tsx)$/);

describe("tokens.ts ↔ globals.admin.css (05 §2)", () => {
  it("chaque jeton est exposé, à la même valeur", () => {
    const declared = new Map(declarations.map((d) => [d.name, d.value]));
    const missing = Object.keys(expected).filter((name) => !declared.has(name));
    expect(missing, "jetons de tokens.ts non exposés par la feuille").toEqual([]);

    const diverging = Object.entries(expected)
      .filter(([name, value]) => declared.has(name) && normalize(declared.get(name) as string) !== normalize(value))
      .map(([name, value]) => `${name} : tokens.ts « ${value} » ≠ CSS « ${declared.get(name)?.trim()} »`);
    expect(diverging, "valeurs divergentes").toEqual([]);
  });

  it("aucune variable --admin-* sans jeton, aucune déclarée deux fois", () => {
    const orphans = declarations.map((d) => d.name).filter((name) => !(name in expected));
    expect(orphans, "variables CSS absentes de tokens.ts — ajouter le jeton d'abord").toEqual([]);

    const seen = new Set<string>();
    const duplicates = declarations.map((d) => d.name).filter((name) => (seen.has(name) ? true : (seen.add(name), false)));
    expect(duplicates, "une valeur déclarée à deux endroits finit par diverger").toEqual([]);
  });

  it("les variables runtime ne sont jamais déclarées (un seul écrivain : le service viewport)", () => {
    const declaredRuntime = declarations.map((d) => d.name).filter((name) => runtime.has(name));
    expect(declaredRuntime).toEqual([]);
  });

  it("chaque rôle typographique a sa classe .admin-type-*", () => {
    const kebab = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    const missing = Object.keys(typography).filter((role) => !css.includes(`.admin-type-${kebab(role)} {`));
    expect(missing).toEqual([]);
  });

  it("le cuivre a disparu et text-subtle porte la valeur contrastée", () => {
    expect(Object.keys(colors).some((k) => k.toLowerCase().includes("cuivre"))).toBe(false);
    expect(colors.textSubtle).toBe("#726B75");
  });
});

/** Déclarations (hors variables) des règles dont la liste de sélecteurs contient exactement `selector`. */
function ruleDeclarations(selector: string): string[] {
  const out: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = (match[1] as string).split(",").map((s) => s.trim());
    if (!selectors.includes(selector)) continue;
    for (const declaration of (match[2] as string).split(";")) {
      const prop = declaration.split(":")[0]?.trim() ?? "";
      if (prop && !prop.startsWith("--")) out.push(prop);
    }
  }
  return out;
}

describe("le fond de l'app a un seul peintre (05 §2, correction 3291428)", () => {
  it(".admin-theme distribue des jetons et ne peint aucun fond", () => {
    // Écrite après les utilitaires, un fond ici écrase la `bg-*` des voiles et cartes de portail.
    expect(ruleDeclarations(".admin-theme").filter((prop) => prop.startsWith("background"))).toEqual([]);
  });

  it(".admin-paint peint le fond, et seul un conteneur pleine page la porte", () => {
    expect(ruleDeclarations(".admin-paint")).toContain("background");
    // src/ui ne rend que des briques et des portails : jamais le fond de l'app.
    const painters = uiFiles.filter((file) => /\badmin-paint\b/.test(stripJsComments(readFileSync(file, "utf8")))).map(rel);
    expect(painters).toEqual([]);
    const shell = readFileSync(path.join(ROOT, "src/app-shell/AdminShell.tsx"), "utf8");
    expect(shell).toMatch(/className="[^"]*\badmin-paint\b[^"]*\badmin-app-container\b/);
  });
});

describe("bandes d'empilement (05 §2.7)", () => {
  /** De la page au filet d'information : chaque couche strictement au-dessus de la précédente. */
  const LAYERS = [
    "base",
    "stickyAction",
    "pageHeader",
    "appHeader",
    "tabBar",
    "tabBarMenu",
    "sheetBackdrop",
    "sheet",
    "sheetNestedBackdrop",
    "sheetNested",
    "modalBackdrop",
    "modal",
    "commandPalette",
    "toast",
  ] as const satisfies readonly (keyof typeof zIndex)[];

  it("le registre est complet, ordonné et sans bande partagée", () => {
    expect(Object.keys(zIndex).sort()).toEqual([...LAYERS].sort());
    const values = LAYERS.map((layer) => zIndex[layer]);
    const inversions = LAYERS.slice(1).filter((layer, i) => zIndex[layer] <= (values[i] as number));
    expect(inversions, "couches qui ne passent pas au-dessus de la précédente").toEqual([]);
  });

  it("les valeurs sont celles décidées : sheet 70/71, imbriquée 80/81, modale 90/91, palette 92, toast 100", () => {
    expect([zIndex.sheetBackdrop, zIndex.sheet]).toEqual([70, 71]);
    expect([zIndex.sheetNestedBackdrop, zIndex.sheetNested]).toEqual([80, 81]);
    expect([zIndex.modalBackdrop, zIndex.modal]).toEqual([90, 91]);
    expect(zIndex.commandPalette).toBe(92);
    expect(zIndex.toast).toBe(100);
  });

  it("chaque couche lit sa propre bande : la sheet imbriquée n'emprunte plus celle des modales", () => {
    const source = (file: string) => stripJsComments(readFileSync(path.join(ROOT, file), "utf8"));
    const sheet = source("src/ui/primitives/Sheet.tsx");
    expect(sheet).toContain("--admin-z-sheet-nested-backdrop");
    expect(sheet).toContain("--admin-z-sheet-nested)");
    expect(sheet).not.toMatch(/--admin-z-modal/);
    const dialog = source("src/ui/patterns/ConfirmDialog.tsx");
    expect(dialog).toContain("--admin-z-modal-backdrop");
    expect(dialog).toContain("--admin-z-modal)");
    expect(source("src/ui/primitives/Toast.tsx")).toContain("--admin-z-toast");
  });

  it("le toast est portalisé vers <body> et sort de la neutralisation des couches modales (05 §3.1)", () => {
    const toast = stripJsComments(readFileSync(path.join(ROOT, "src/ui/primitives/Toast.tsx"), "utf8"));
    expect(toast).toMatch(/createPortal\([\s\S]*document\.body\s*,?\s*\)/);
    expect(toast).toContain(`pointerEvents: "auto"`);
  });
});

describe("aucune valeur en dur hors des jetons (05 §2)", () => {
  it("la feuille n'écrit couleur, durée ni z-index qu'à travers ses variables", () => {
    // Hors déclarations de jetons : toute propriété ordinaire.
    const ordinary = [...css.matchAll(/(?<![-\w])([a-z-]+)\s*:\s*([^;{}]+);/g)]
      .map((m) => ({ prop: m[1] as string, value: m[2] as string }))
      .filter((d) => !d.prop.startsWith("--"));

    const offenders = ordinary
      .filter(
        ({ prop, value }) =>
          /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(value) ||
          (prop === "z-index" && !value.includes("var(")) ||
          /\b\d+(\.\d+)?m?s\b/.test(value.replace(/var\([^)]*\)/g, "")) ||
          /^transition$/.test(prop) && /\ball\b/.test(value),
      )
      .map(({ prop, value }) => `${prop}: ${value.trim()}`);
    expect(offenders).toEqual([]);
  });

  it("src/ui ne code ni couleur, ni rayon, ni durée, ni z-index littéral", () => {
    const rules: [RegExp, string][] = [
      [/#[0-9A-Fa-f]{3,8}\b/, "couleur hexadécimale"],
      [/\brgba?\(|\bhsla?\(/, "couleur rgb/hsl"],
      [/\b(?:text|bg|border|ring|fill|stroke|outline|from|via|to|divide|placeholder)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/, "couleur Tailwind"],
      [/\brounded(?:-[trblse]{1,2})?(?:-(?:none|sm|md|lg|xl|2xl|3xl|full)|-\[\d)|\brounded(?=["'\s`])/, "rayon hors jeton"],
      [/\bborderRadius\s*:\s*["'\d]/, "rayon hors jeton"],
      [/\bz-(?:\d|\[\d)/, "z-index littéral"],
      [/\bzIndex\s*:\s*\d/, "z-index littéral"],
      [/\b(?:duration|delay)-(?:\d|\[\d)/, "durée littérale"],
      [/\b(?:transition-all|transition:\s*all)\b/, "transition: all"],
      [/(?<![-\w])shadow-(?:sm|md|lg|xl|2xl|inner)\b|(?<![-\w])shadow-\[\d/, "ombre hors jeton"],
      // Écritures silencieusement ignorées par Tailwind 3 (valeur ambiguë) :
      [/\b(?:duration|ease|shadow)-\[var\(/, "classe ambiguë, non générée — utiliser [transition-duration:var(…)] ou shadow-[shadow:var(…)]"],
    ];
    const offenders: string[] = [];
    for (const file of uiFiles) {
      const source = stripJsComments(readFileSync(file, "utf8"));
      source.split("\n").forEach((line, i) => {
        for (const [pattern, label] of rules) {
          if (pattern.test(line)) offenders.push(`${rel(file)}:${i + 1} — ${label} : ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("toute var(--admin-*) lue par src/ui ou la feuille existe", () => {
    const known = new Set([...Object.keys(expected), ...runtime]);
    const sources = [
      { name: "src/design/globals.admin.css", text: css },
      ...uiFiles.map((file) => ({ name: rel(file), text: readFileSync(file, "utf8") })),
    ];
    const unknown = sources.flatMap(({ name, text }) =>
      [...text.matchAll(/var\((--admin-[a-z0-9-]+)/g)]
        .map((m) => m[1] as string)
        .filter((v) => !known.has(v))
        .map((v) => `${name} : ${v}`),
    );
    expect([...new Set(unknown)]).toEqual([]);
  });

  it("tailwind.config.ts ne redéclare aucune valeur admin", () => {
    const config = stripJsComments(readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8"));
    expect(config).not.toMatch(/--admin-/);
    const adminValues = Object.values(colors).filter((v) => v.startsWith("#")).map((v) => v.toLowerCase());
    expect(adminValues.filter((hex) => config.toLowerCase().includes(hex))).toEqual([]);
  });
});
