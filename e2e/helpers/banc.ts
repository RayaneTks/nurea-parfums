import path from "node:path";
import { build } from "esbuild";
import type { Page, TestInfo } from "@playwright/test";
import { BANC_GLOBAL, type Scene } from "../fixtures/couches-contrat";

/**
 * Compile un banc (`e2e/fixtures/*.tsx`) en un script autonome — React et les briques réelles de
 * `src/` compris — et le monte dans la page ouverte. Une compilation par banc et par worker.
 *
 * Deux bancs : les couches par-dessus l'écran (`couches.tsx`) et les états de l'Accueil
 * (`accueil.tsx`, J14 : le vide de départ et le cas « tout va bien » sont inatteignables depuis le
 * jeu e2e partagé, qui porte des documents et des alertes de stock).
 */

const compiled = new Map<string, Promise<string>>();

/**
 * Les actions serveur, remplacées par un bouchon dans le bundle du banc.
 *
 * Un composant client d'écran importe ses actions (`MovementSheet` → `@/server/treasury/actions`).
 * Dans l'app, Next en fait une référence client et ne compile jamais le module pour le navigateur ;
 * esbuild, lui, suit l'import et tombe sur `src/server/db/transaction.ts`, donc sur `node:async_hooks`
 * — le banc ne compilait plus. Le bouchon garde les composants réels et rend toute action inerte : le
 * banc n'éprouve que l'affichage, il n'écrit jamais. Un appel lève, au lieu d'échouer en silence.
 */
const SERVER_STUB = `module.exports = new Proxy({}, {
  get: (_t, name) => () => { throw new Error("Banc : action serveur « " + String(name) + " » indisponible (affichage seulement)."); },
});`;

/**
 * `process`, borné au bundle du banc.
 *
 * Les briques réelles passent par `next/link` et `next/navigation` ; leurs modules lisent
 * `process.env.__NEXT_DEV_SERVER` et consorts **au chargement**. Dans une page Next, le bundler a
 * remplacé ces lectures ; ici, esbuild n'en remplace qu'une (`NODE_ENV`) et le script injecté levait
 * `ReferenceError: process is not defined` AVANT de poser son global — le banc ne montait pas, et le
 * test ne disait que « élément introuvable ».
 *
 * Le faux `process` est passé en PARAMÈTRE de l'IIFE : il n'existe que dans la portée du bundle. Le
 * poser sur `window` changerait le comportement de l'app sous test (des bibliothèques lisent
 * `typeof process` pour se croire côté serveur).
 */
const PROCESS_SHIM = "{ env: {}, nextTick: (fn) => queueMicrotask(fn), emit: () => false, platform: 'browser', version: '' }";

const stubServerActions = {
  name: "banc-stub-actions-serveur",
  setup(build: { onResolve: Function; onLoad: Function }) {
    build.onResolve({ filter: /^@\/server\// }, (args: { path: string }) => ({ path: args.path, namespace: "banc-stub" }));
    build.onLoad({ filter: /.*/, namespace: "banc-stub" }, () => ({ contents: SERVER_STUB, loader: "js" as const }));
  },
};

function compile(root: string, entry: string): Promise<string> {
  const found = compiled.get(entry);
  if (found) return found;
  const job = build({
    entryPoints: [path.join(root, entry)],
    tsconfig: path.join(root, "tsconfig.json"),
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2020",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    banner: { js: "(function (process) {" },
    footer: { js: `})(${PROCESS_SHIM});` },
    plugins: [stubServerActions],
    logLevel: "silent",
  }).then((result) => {
    const output = result.outputFiles[0];
    if (!output) throw new Error(`Banc ${entry} : esbuild n'a rien produit.`);
    return output.text;
  });
  compiled.set(entry, job);
  return job;
}

function rootOf(testInfo: TestInfo): string {
  return path.dirname(testInfo.config.configFile ?? path.join(process.cwd(), "playwright.config.ts"));
}

/**
 * Monte une scène d'un banc dans la page courante (déjà chargée : sa feuille admin s'y applique).
 *
 * Les erreurs du navigateur pendant l'injection sont collectées et jointes à l'échec : un `?.mount()`
 * optionnel avalait silencieusement le cas « le bundle a levé avant de poser son global », et le test
 * ne disait plus que « élément introuvable », quinze secondes plus tard, sans la cause.
 */
async function mount(page: Page, testInfo: TestInfo, entry: string, global: string, scene: string): Promise<void> {
  const problems: string[] = [];
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === "error") problems.push(message.text());
  };
  const onPageError = (error: Error) => problems.push(`${error.name}: ${error.message}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    await page.addScriptTag({ content: await compile(rootOf(testInfo), entry) });
    const posted = await page.evaluate(
      ({ key, name }) => {
        const banc = (window as unknown as Record<string, { mount: (s: string) => void } | undefined>)[key];
        if (!banc) return false;
        banc.mount(name);
        return true;
      },
      { key: global, name: scene },
    );
    if (!posted) {
      throw new Error(
        `Banc ${entry} : le script injecté n'a pas posé « window.${global} ».` +
          (problems.length > 0 ? `\nErreurs du navigateur :\n  ${problems.join("\n  ")}` : ""),
      );
    }
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

/** Banc des couches (05 §2.7) : sheets, filet « Annuler », confirmation en échec. */
export async function mountScene(page: Page, testInfo: TestInfo, scene: Scene): Promise<void> {
  await mount(page, testInfo, "e2e/fixtures/couches.tsx", BANC_GLOBAL, scene);
}

/** Banc des états de l'Accueil (06 E01 « États », J14). */
export async function mountAccueil(page: Page, testInfo: TestInfo, scene: string, global: string): Promise<void> {
  await mount(page, testInfo, "e2e/fixtures/accueil.tsx", global, scene);
}
