import { describe, expect, it } from "vitest";
import { exists, importsOf, lineOf, listSources, read, resolveImport, stripComments } from "./support/sources";

/**
 * Liste fermée des routes HTTP de la gestion (docs/refonte/04-ARCHITECTURE.md §3.5) : cinq GET, rien
 * d'autre. Aucune route n'écrit ; celles de `/api/admin` passent par `defineReadRoute`.
 */

const CLOSED_LIST: { file: string; milestone: string }[] = [
  { file: "app/api/admin/search/route.ts", milestone: "J8" },
  { file: "app/api/admin/picker/route.ts", milestone: "J9" },
  { file: "app/api/admin/export/compta/route.ts", milestone: "J12" },
  { file: "app/api/pwa/admin/route.ts", milestone: "existant" },
  { file: "app/admin-sw.js/route.ts", milestone: "J16" },
];

const GESTION_ROUTE = /^app\/(admin(\/|-sw\.js\/)|api\/admin\/|api\/pwa\/admin\/)/;
const ROUTE_FILE = /(^|\/)route\.[cm]?[jt]sx?$/;

function readRouteViolations(file: string, source: string): string[] {
  const code = stripComments(source);
  return [...code.matchAll(/^export\b[^\n]*/gm)]
    .filter((match) => !/^export const GET = defineReadRoute\(/.test(match[0]))
    .map((match) => `${file}:${lineOf(code, match.index ?? 0)} : « ${match[0].trim()} » — seul « export const GET = defineReadRoute( »`);
}

function writeImports(file: string, source: string): string[] {
  return importsOf(source)
    .filter((ref) => /^src\/server\/[^/]+\/(writer|movements|stock|actions)$/.test(resolveImport(file, ref.specifier)))
    .map((ref) => `${file} importe « ${ref.specifier} » : une route ne fait que lire`);
}

const ROUTES = listSources("app").filter((file) => ROUTE_FILE.test(file));

describe("routes HTTP de la gestion (04 §3.5)", () => {
  it("les route.ts de la gestion appartiennent à la liste fermée", () => {
    const allowed = new Set(CLOSED_LIST.map((route) => route.file));
    expect(ROUTES.filter((file) => GESTION_ROUTE.test(file) && !allowed.has(file))).toEqual([]);
  });

  it("une route de /api/admin n'exporte que GET, fabriqué par defineReadRoute", () => {
    const found = ROUTES.filter((file) => file.startsWith("app/api/admin/")).flatMap((file) =>
      readRouteViolations(file, read(file)),
    );
    expect(found).toEqual([]);
  });

  it("aucune route n'importe un writer ni une action", () => {
    expect(ROUTES.flatMap((file) => writeImports(file, read(file)))).toEqual([]);
  });

  it("le contrôle détecte un POST et un import de writer", () => {
    const source = 'import * as w from "@/server/payments/writer";\nexport const GET = defineReadRoute("x", h);\nexport async function POST() {}';
    expect(readRouteViolations("app/api/admin/x/route.ts", source)).toHaveLength(1);
    expect(writeImports("app/api/admin/x/route.ts", source)).toHaveLength(1);
  });

  for (const route of CLOSED_LIST.filter((entry) => !exists(entry.file))) {
    it.todo(`${route.file} — livré au jalon ${route.milestone}`);
  }
});
