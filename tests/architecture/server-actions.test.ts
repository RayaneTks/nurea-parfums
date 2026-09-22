import { describe, expect, it } from "vitest";
import { importsOf, isTestFile, lineOf, listSources, read, resolveImport, stripComments } from "./support/sources";

/**
 * Une seule pile d'écriture (docs/refonte/04-ARCHITECTURE.md §3.3) : `"use server"` n'existe que dans
 * `src/server/<domaine>/actions.ts` (et le formulaire de contact de la vitrine), chaque export y est
 * fabriqué par `defineAction`, et seule `loginAction` est publique.
 */

const ACTIONS_FILE = /^src\/server\/[^/]+\/actions\.ts$/;
const VITRINE_ACTIONS = new Set(["src/actions/contact.ts"]);
const DIRECTIVE = /^\s*(["'])use server\1;?\s*$/m;
const SOURCES = listSources("app", "src", "proxy.ts", "instrumentation.ts").filter((file) => !isTestFile(file));

/** Instructions `export` de premier niveau, une par entrée. */
function exportStatements(code: string): { text: string; line: number }[] {
  return [...code.matchAll(/^export\b[^\n]*/gm)].map((match) => ({
    text: match[0],
    line: lineOf(code, match.index ?? 0),
  }));
}

function actionsFileViolations(file: string, source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  const firstStatement = code.split("\n").map((line) => line.trim()).find(Boolean);
  if (firstStatement !== '"use server";') found.push(`${file} : la première instruction doit être "use server"`);

  for (const { text, line } of exportStatements(code)) {
    if (/^export\s+(type|interface)\s/.test(text)) continue;
    if (!/^export const \w+Action = defineAction\(/.test(text)) {
      found.push(`${file}:${line} : « ${text.trim()} » — seul « export const xAction = defineAction( » est permis`);
    }
  }

  const blocks = code.split(/^(?=export const )/m);
  for (const block of blocks) {
    if (!/\bpublic\s*:\s*true\b/.test(block)) continue;
    const name = /^export const (\w+)/.exec(block)?.[1];
    if (!(file === "src/server/auth/actions.ts" && name === "loginAction")) {
      found.push(`${file} : « public: true » réservé à loginAction (trouvé sur ${name ?? "un bloc hors export"})`);
    }
  }

  for (const ref of importsOf(source)) {
    const target = resolveImport(file, ref.specifier);
    if (/^src\/server\/([^/]+\/queries|chiffres(\/.*)?)$/.test(target)) {
      found.push(`${file} importe « ${ref.specifier} » : une action lit dans sa transaction (tx.db), pas par une query`);
    }
  }
  return found;
}

describe("server actions (04 §3.3)", () => {
  it('"use server" n\'apparaît que dans src/server/<domaine>/actions.ts et src/actions/contact.ts', () => {
    const offenders = SOURCES.filter((file) => DIRECTIVE.test(stripComments(read(file)))).filter(
      (file) => !ACTIONS_FILE.test(file) && !VITRINE_ACTIONS.has(file),
    );
    expect(offenders).toEqual([]);
  });

  it("chaque actions.ts n'exporte que des defineAction, public réservé à loginAction, sans query", () => {
    const found = SOURCES.filter((file) => ACTIONS_FILE.test(file)).flatMap((file) =>
      actionsFileViolations(file, read(file)),
    );
    expect(found).toEqual([]);
  });

  it("defineAction n'est appelé que depuis un actions.ts", () => {
    const offenders = SOURCES.filter(
      (file) => !ACTIONS_FILE.test(file) && file !== "src/server/core/define-action.ts",
    ).filter((file) => /\bdefineAction\s*\(/.test(stripComments(read(file))));
    expect(offenders).toEqual([]);
  });

  it("le contrôle détecte un export hors defineAction et un public abusif", () => {
    const source = [
      '"use server";',
      'import "server-only";',
      "export async function sneaky() {}",
      'export const saveAction = defineAction("x.save", schema, handler, { public: true });',
    ].join("\n");
    expect(actionsFileViolations("src/server/x/actions.ts", source)).toHaveLength(2);
  });
});
