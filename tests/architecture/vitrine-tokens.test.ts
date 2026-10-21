import { describe, expect, it } from "vitest";
import { VITRINE_THEMES } from "@/design/brand";
import { read } from "./support/sources";

/**
 * Jetons de la vitrine (DESIGN.md § Couleurs, 04-PLAN-EXECUTION.md § B.2).
 *
 * Un thème ne redéfinit que le sémantique : chaque jeton qui change d'un thème à l'autre doit exister
 * dans les DEUX blocs (`:root, .dark` et `.light`) — un oubli ferait hériter le clair d'une valeur
 * sombre, illisible. Les dérivés (verre, survol du primaire) sont déclarés une fois sur `:root` et se
 * recalculent avec le thème actif. Aucune dimension ne dépend du thème (voir `LAYOUT`).
 */

const CSS = "app/globals.css";

/** Jetons propres à chaque thème. */
const THEMED = [
  "--bg",
  "--surface-1",
  "--surface-2",
  "--line",
  "--text-1",
  "--text-2",
  "--text-3",
  "--error",
  "--focus",
  "--on-primary",
  "--accent",
  "--on-accent",
  "--shadow-float",
  "--glass-edge",
] as const;

/**
 * Jetons de dimension (interlignage, espacements, rayons, tailles) : **jamais** dans un bloc de thème.
 * Un thème ne change que des couleurs ; une dimension qui varie déplace toute la page à la bascule
 * (l'interlignage du texte courant, 1,65 en sombre et 1,6 en clair, décalait chaque visuel situé sous un
 * paragraphe — même quand l'image était le même fichier dans les deux thèmes).
 */
const LAYOUT = /^--(leading|space|r-|gutter|content|text-size|size)/;

/** Dérivés communs, calculés depuis les jetons du thème actif. */
const SHARED = ["--glass", "--glass-solid", "--primary-hover"] as const;

const source = read(CSS);

/** Corps du premier bloc dont le sélecteur est exactement `selector`. */
function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(source);
  if (!match) throw new Error(`bloc ${selector} absent de ${CSS}`);
  return match[1] ?? "";
}

const declared = (body: string) => new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

describe("jetons de la vitrine", () => {
  const dark = declared(block(":root,\n  .dark"));
  const light = declared(block(".light"));

  it.each(THEMED)("%s est défini dans les deux thèmes", (token) => {
    expect(dark.has(token), `${token} manque au thème sombre`).toBe(true);
    expect(light.has(token), `${token} manque au thème clair`).toBe(true);
  });

  it("aucun thème ne déclare une dimension : la bascule ne déplace rien", () => {
    const layout = [...dark, ...light].filter((token) => token !== undefined && LAYOUT.test(token));
    expect(layout, "jeton de dimension déclaré dans un thème").toEqual([]);
    expect(declared(source).has("--leading-body"), "--leading-body déclaré une fois, hors thème").toBe(true);
  });

  it("aucun thème ne déclare un jeton que l'autre ignore", () => {
    expect([...light].sort()).toEqual([...dark].sort());
  });

  it("les dérivés communs sont déclarés sur :root", () => {
    const all = declared(source);
    for (const token of SHARED) expect(all.has(token), token).toBe(true);
  });

  it("aucun jeton de l'ancienne charte ne survit", () => {
    expect(source).not.toMatch(/--nurea-|cuivre|\.nurea-/);
  });

  it("brand.ts recopie les hex des deux thèmes, présents en commentaire dans le CSS", () => {
    for (const theme of [VITRINE_THEMES.dark, VITRINE_THEMES.light]) {
      for (const hex of Object.values(theme)) expect(source, hex).toContain(hex);
    }
  });
});
