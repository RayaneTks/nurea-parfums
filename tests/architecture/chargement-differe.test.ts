import { describe, expect, it } from "vitest";
import { exists, importsOf, listSources, read, resolveImport, stripComments } from "./support/sources";

/**
 * Chargement différé (docs/refonte/04-ARCHITECTURE.md §15 règle 11, critère de 07 J16).
 *
 * Trois morceaux de code ne doivent PAS peser sur le paquet initial des écrans terrain — ceux que le
 * gérant ouvre cent fois par jour : le graphe, la palette de commandes et la conversion d'image. Ils
 * n'arrivent qu'au premier usage (`next/dynamic`, ou `import()` dans le geste).
 *
 * Vérifié par le GRAPHE D'IMPORTS STATIQUES, pas par une mesure de paquet : une mesure bouge à chaque
 * montée de version de Next et ne dit pas QUI a ramené le code. Ici, un `import` statique glissé dans
 * le shell nomme le fichier fautif. La règle est celle qui compte : si aucun chemin statique ne mène
 * au module depuis un écran terrain, son code est dans un autre morceau, quel que soit le bundler.
 */

/** Ce qui doit rester hors du paquet initial, et d'où ça doit rester joignable. */
const DIFFERES = [
  { quoi: "le graphe", module: "src/ui/patterns/BarChartCanvas" },
  { quoi: "la palette de commandes", module: "src/app-shell/CommandPalette" },
  { quoi: "la conversion d'image", module: "src/features/catalogue/components/image-convert" },
] as const;

/**
 * Les écrans terrain de 06 §2 (PC-01 à PC-05) plus la coque, montée sur tous les écrans. Si le code
 * différé n'est joignable depuis aucun de ces points d'entrée, il ne charge aucun geste quotidien.
 */
const ENTREES = [
  "src/app-shell/AdminShell.tsx",
  "app/admin/(gestion)/layout.tsx",
  "app/admin/(gestion)/page.tsx",
  "app/admin/(gestion)/vendre/page.tsx",
  "app/admin/(gestion)/commandes/page.tsx",
  "app/admin/(gestion)/encaisser/page.tsx",
];

const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Le fichier d'un module résolu (`src/ui/patterns/BarChart` → `src/ui/patterns/BarChart.tsx`). */
function fileOf(moduleId: string): string | null {
  if (!moduleId.startsWith("src/") && !moduleId.startsWith("app/")) return null;
  for (const extension of CANDIDATES) {
    if (exists(moduleId + extension)) return moduleId + extension;
  }
  return null;
}

/** Imports STATIQUES seulement : `import … from` et `export … from`. `import()` est justement l'exception. */
function staticImports(file: string): string[] {
  const code = stripComments(read(file));
  const refs: string[] = [];
  const patterns = [
    /^[ \t]*import\s+(?!type\s)(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"'\n]+)["']/gm,
    /^[ \t]*export\s+(?!type\s)(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s+["']([^"'\n]+)["']/gm,
  ];
  for (const regex of patterns) {
    for (const match of code.matchAll(regex)) refs.push(resolveImport(file, match[1] as string));
  }
  return refs;
}

/** Chemin d'imports statiques d'une entrée jusqu'au module, ou `null` s'il n'y en a aucun. */
function staticPathTo(entry: string, target: string): string[] | null {
  const seen = new Set<string>();
  const queue: { file: string; path: string[] }[] = [{ file: entry, path: [entry] }];
  while (queue.length > 0) {
    const { file, path } = queue.shift() as { file: string; path: string[] };
    if (seen.has(file)) continue;
    seen.add(file);
    for (const moduleId of staticImports(file)) {
      if (moduleId === target) return [...path, target];
      const next = fileOf(moduleId);
      if (next && !seen.has(next)) queue.push({ file: next, path: [...path, next] });
    }
  }
  return null;
}

/** Fichiers qui chargent le module par `import()` — la façon voulue. */
function dynamicImporters(target: string): string[] {
  return listSources("src", "app").filter((file) => {
    const code = stripComments(read(file));
    return [...code.matchAll(/\bimport\s*\(\s*["']([^"'\n]+)["']\s*\)/g)].some(
      (match) => resolveImport(file, match[1] as string) === target,
    );
  });
}

describe("chargement différé (04 §15 règle 11)", () => {
  it("les points d'entrée éprouvés existent", () => {
    expect(ENTREES.filter((file) => !exists(file))).toEqual([]);
    expect(DIFFERES.filter(({ module }) => fileOf(module) === null)).toEqual([]);
  });

  for (const { quoi, module } of DIFFERES) {
    it(`${quoi} n'est joignable par aucun import statique depuis un écran terrain`, () => {
      const chemins = ENTREES.map((entry) => staticPathTo(entry, module))
        .filter((path): path is string[] => path !== null)
        .map((path) => path.join(" → "));
      expect(chemins, `${module} entre dans le paquet initial par :\n  ${chemins.join("\n  ")}`).toEqual([]);
    });

    it(`${quoi} est bien chargé par un import() quelque part (sinon c'est du code mort)`, () => {
      expect(dynamicImporters(module).length).toBeGreaterThan(0);
    });
  }

  it("recharts n'est plus importé nulle part : le graphe est du SVG écrit à la main (05 §7 n°23)", () => {
    const importeurs = listSources("src", "app").filter((file) =>
      importsOf(read(file)).some((ref) => ref.specifier === "recharts"),
    );
    expect(importeurs).toEqual([]);
  });

  it("le contrôle sait suivre une chaîne : la coque atteint bien la tab bar", () => {
    expect(staticPathTo("src/app-shell/AdminShell.tsx", "src/app-shell/TabBar")).not.toBeNull();
  });
});
