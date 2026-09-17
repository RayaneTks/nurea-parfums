import path from "node:path";
import { build } from "esbuild";
import type { Page, TestInfo } from "@playwright/test";
import { BANC_GLOBAL, type Scene } from "../fixtures/couches-contrat";

/**
 * Compile le banc des couches (`e2e/fixtures/couches.tsx`) en un script autonome — React et les
 * briques réelles de `src/` compris — et le monte dans la page ouverte. Une compilation par worker.
 */

let compiled: Promise<string> | null = null;

function compile(root: string): Promise<string> {
  compiled ??= build({
    entryPoints: [path.join(root, "e2e/fixtures/couches.tsx")],
    tsconfig: path.join(root, "tsconfig.json"),
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    logLevel: "silent",
  }).then((result) => {
    const output = result.outputFiles[0];
    if (!output) throw new Error("Banc des couches : esbuild n'a rien produit.");
    return output.text;
  });
  return compiled;
}

/** Monte `scene` dans la page courante (déjà chargée : sa feuille admin s'applique au banc). */
export async function mountScene(page: Page, testInfo: TestInfo, scene: Scene): Promise<void> {
  const root = path.dirname(testInfo.config.configFile ?? path.join(process.cwd(), "playwright.config.ts"));
  await page.addScriptTag({ content: await compile(root) });
  await page.evaluate(
    ({ global, name }) => (window as unknown as Record<string, { mount: (s: string) => void }>)[global]?.mount(name),
    { global: BANC_GLOBAL, name: scene },
  );
}
