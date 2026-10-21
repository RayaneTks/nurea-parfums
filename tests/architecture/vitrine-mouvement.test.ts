import { describe, expect, it } from "vitest";
import { isTestFile, listSources, read, stripComments } from "./support/sources";

/**
 * Mouvement de la vitrine (04-PLAN-EXECUTION.md § B.7, T18).
 *
 * - On anime `transform`, `opacity`, `clip-path` et des couleurs ; jamais une dimension ni une position
 *   (`width`, `height`, `top`, marges…) : le navigateur recalculerait la page à chaque image.
 * - Durées et courbes viennent des jetons (`--dur-*`, `--ease-*`, classes `duration-dur-*`,
 *   `ease-soft|sheet|move`), jamais d'une valeur recopiée ni des défauts de Tailwind.
 * - Le survol n'existe que sous un pointeur fin (`mouse-hover:`, `@media (hover: hover)`) : au doigt, un
 *   `:hover` reste collé après le toucher.
 * - Mouvement réduit : plus aucun déplacement ; les fondus restent, courts.
 *
 * Dérogation : `mouvement-ok: <raison>` dans un commentaire sur la même ligne.
 */

const SCOPE = ["app/(shop)", "src/components", "src/hooks", "src/lib/motion"];
const CSS = "app/globals.css";

const LAYOUT_PROPS = String.raw`(?:width|height|min-height|max-height|min-width|max-width|top|left|right|bottom|inset|margin[\w-]*|padding[\w-]*|grid-template-[\w-]+|font-size|line-height)`;
const WAIVER = /mouvement-ok:\s*\S/;

const sources = () => listSources(...SCOPE).filter((file) => !isTestFile(file));

type Hit = { file: string; line: number; text: string };

function hits(file: string, code: string, pattern: RegExp): Hit[] {
  const raw = read(file).split("\n");
  return code.split("\n").flatMap((text, index) =>
    pattern.test(text) && !WAIVER.test(raw[index] ?? "") ? [{ file, line: index + 1, text: text.trim() }] : []
  );
}

/** Corps de chaque bloc ouvert par `opener` (accolades équilibrées). */
function blocks(css: string, opener: RegExp): string[] {
  const out: string[] = [];
  for (const match of css.matchAll(new RegExp(opener, "g"))) {
    let depth = 0;
    const start = css.indexOf("{", match.index);
    for (let i = start; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) {
        out.push(css.slice(start + 1, i));
        break;
      }
    }
  }
  return out;
}

describe("vitrine — mouvement", () => {
  const css = stripComments(read(CSS));

  it("aucune transition ni animation ne porte sur une dimension ou une position", () => {
    const cssHits = hits(CSS, css, new RegExp(String.raw`transition(?:-property)?\s*:[^;]*\b${LAYOUT_PROPS}\b`));
    const keyframeHits = blocks(css, /@keyframes\s+[\w-]+\s*\{/)
      .filter((body) => new RegExp(String.raw`(?:^|[\s;{])${LAYOUT_PROPS}\s*:`).test(body))
      .map((body) => body.trim().slice(0, 80));
    const tsxHits = sources().flatMap((file) =>
      hits(
        file,
        stripComments(read(file)),
        new RegExp(String.raw`transition-\[[^\]]*\b${LAYOUT_PROPS}\b|transitionProperty\s*:\s*["'][^"']*\b${LAYOUT_PROPS}\b`)
      )
    );
    expect([...cssHits, ...tsxHits]).toEqual([]);
    expect(keyframeHits).toEqual([]);
  });

  it("durées et courbes viennent des jetons", () => {
    const tsxHits = sources().flatMap((file) =>
      hits(
        file,
        stripComments(read(file)),
        /(?<![\w-])(?:duration-(?:\d+|\[)|ease-(?:in|out|in-out|linear)(?![\w-])|delay-\d)|cubic-bezier\(/
      )
    );
    const cssHits = hits(CSS, css, /(?:transition|animation)(?:-duration|-delay)?\s*:[^;]*(?<![\w-])\d+(?:\.\d+)?m?s\b(?!\))/);
    expect([...tsxHits, ...cssHits]).toEqual([]);
  });

  it("le survol n'existe que sous un pointeur fin", () => {
    const tsxHits = sources().flatMap((file) =>
      hits(file, stripComments(read(file)), /(?<![\w-])(?:group-|peer-)?hover:/)
    );
    expect(tsxHits).toEqual([]);

    const gated = blocks(css, /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{/).join("\n");
    const count = (text: string) => (text.match(/:hover\b/g) ?? []).length;
    expect(count(css)).toBe(count(gated));
  });

  it("mouvement réduit : aucun déplacement ne survit", () => {
    const reduced = blocks(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/).join("\n");
    for (const token of ["--dur-3", "--dur-3-exit", "--dur-4", "--stagger", "--stagger-max"]) {
      expect(reduced).toMatch(new RegExp(String.raw`${token}\s*:\s*0ms`));
    }
    expect(reduced).toMatch(/--press\s*:\s*none/);
    // Une animation à `--dur-2` qui déplace (le panneau des suggestions) passe au fondu seul.
    expect(reduced).toMatch(/\.suggestions\s*\{[^}]*animation-name:\s*fade-in/);
  });
});
