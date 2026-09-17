import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Deux registres disjoints jusque dans les feuilles de style (CLAUDE.md) :
 * une feuille importée par le root layout embarquerait sa charte dans les deux.
 */

const ROOT = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function importers(stylesheet: string): string[] {
  const pattern = new RegExp(`import\\s+["'][^"']*${stylesheet.replace(".", "\\.")}["']`);
  return [...sourceFiles(path.join(ROOT, "app")), ...sourceFiles(path.join(ROOT, "src"))]
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(ROOT, file).split(path.sep).join("/"));
}

describe("registres CSS (CLAUDE.md, « Structure des Dossiers »)", () => {
  it("le root layout n'importe aucune feuille de style", () => {
    const rootLayout = readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8");
    expect(rootLayout).not.toMatch(/import\s+["'][^"']+\.css["']/);
  });

  it("seul app/admin/layout.tsx importe globals.admin.css", () => {
    expect(importers("globals.admin.css")).toEqual(["app/admin/layout.tsx"]);
  });

  // La 404 globale vit hors de tout groupe de routes et relève de la vitrine :
  // le root layout n'ayant pas de CSS, elle charge elle-même sa feuille.
  it("seuls le layout vitrine et la 404 globale importent globals.css", () => {
    expect(importers("/globals.css").sort()).toEqual(["app/(shop)/layout.tsx", "app/not-found.tsx"]);
  });
});
