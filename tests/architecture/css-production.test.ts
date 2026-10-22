import { readFileSync } from "node:fs";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { describe, expect, it } from "vitest";

/**
 * La feuille de la vitrine, passée par Tailwind comme au build de production.
 *
 * Le 22/10/2026, un déploiement a échoué chez Vercel (Turbopack + Lightning CSS : « Invalid empty
 * selector ») alors que le build local (webpack) passait : des règles `.light …` posées dans un
 * `@media` de `@layer components` recevaient de Tailwind une copie « !important » (le mot `!light`
 * figure dans le code) au sélecteur vide. Ce test rejoue l'étape Tailwind et refuse tout sélecteur vide.
 */
describe("app/globals.css au build de production", () => {
  it("aucun sélecteur vide dans le CSS généré par Tailwind", async () => {
    const source = readFileSync("app/globals.css", "utf8");
    const { css } = await postcss([tailwindcss("./tailwind.config.ts")]).process(source, { from: "app/globals.css" });
    const vides = css
      .split("\n")
      .map((ligne, i) => ({ ligne: i + 1, texte: ligne }))
      .filter(({ texte }) => /^\s*\{\s*$/.test(texte));
    expect(vides).toEqual([]);
  }, 60_000);
});
