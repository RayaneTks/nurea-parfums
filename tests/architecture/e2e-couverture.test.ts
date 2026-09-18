import { describe, expect, it } from "vitest";
import { ROUTE_SPECS, type RouteName } from "@/app-shell/routes";
import { read } from "./support/sources";

/**
 * Couverture d'affichage : l'inventaire côté app (`src/app-shell/routes.ts`) et l'inventaire côté
 * banc (`e2e/routes.ts`) disent la même chose (07 J16 : « `e2e/routes.ts` = toutes les routes de
 * 06 §1.2 et toutes les sheets de 06 §1.8 »).
 *
 * `layout-invariants.spec.ts` contient déjà `uncoveredRoutes()` — mais c'est du Playwright : il faut
 * une base, un serveur et deux minutes pour l'apprendre. Ici, la même vérité tombe en 20 ms, dans
 * `npm test`, à chaque PR. Un écran livré sans cas d'affichage se voit avant d'être poussé.
 *
 * `e2e/routes.ts` est LU, jamais importé : il tire `e2e/fixtures/seed.ts`, donc `@prisma/client`, qui
 * charge `.env` — c'est-à-dire la PRODUCTION — au moment de l'import. Aucun test d'architecture ne
 * doit pouvoir ouvrir cette porte.
 */

const E2E_ROUTES = "e2e/routes.ts";
const ECRANS = "docs/refonte/06-ECRANS-PARCOURS.md";

const source = read(E2E_ROUTES);

/** Les noms d'écran cités par un cas : `route: "commandes"`, ou `("commandes" as const)` d'un cas calculé. */
const routesCitees = new Set<string>([
  ...[...source.matchAll(/\broute:\s*"(\w+)"/g)].map((match) => match[1] as string),
  ...[...source.matchAll(/\(\s*"(\w+)"\s+as\s+const\s*\)/g)].map((match) => match[1] as string),
]);

/** Les sheets citées par un cas : `sheet: "S02"`, `screen: "S01"`, ou un enchaînement « S14 → S15 ». */
const sheetsCitees = new Set<string>(
  [...source.matchAll(/\b(?:sheet|screen):\s*"(S\d{2})(?:\s*→\s*(S\d{2}))?/g)].flatMap((match) =>
    [match[1], match[2]].filter((value): value is string => value !== undefined),
  ),
);

/** L'inventaire des sheets de 06 §3 : une par titre `#### S01 — …`. La liste se met à jour toute seule. */
const sheetsDe06 = [...read(ECRANS).matchAll(/^#### (S\d{2}) —/gm)].map((match) => match[1] as string);

const livrees = (Object.keys(ROUTE_SPECS) as RouteName[]).filter((name) => ROUTE_SPECS[name].etat !== "a-venir");

describe("couverture d'affichage : routes.ts ↔ e2e/routes.ts (07 J16)", () => {
  it("chaque écran livré a au moins un cas dans e2e/routes.ts", () => {
    const sansCas = livrees.filter((name) => !routesCitees.has(name));
    expect(sansCas, `écrans livrés sans cas d'affichage : ${sansCas.join(", ")}`).toEqual([]);
  });

  it("aucun cas ne vise un écran inconnu de l'inventaire", () => {
    const inconnus = [...routesCitees].filter((name) => !(name in ROUTE_SPECS));
    expect(inconnus).toEqual([]);
  });

  it("aucun cas ne vise un écran encore à venir (son cas passerait pour un succès)", () => {
    const aVenir = [...routesCitees].filter((name) => name in ROUTE_SPECS && ROUTE_SPECS[name as RouteName].etat === "a-venir");
    expect(aVenir).toEqual([]);
  });

  it("06 décrit bien vingt et une sheets, S01 à S21", () => {
    expect(sheetsDe06).toEqual(Array.from({ length: 21 }, (_, i) => `S${String(i + 1).padStart(2, "0")}`));
  });

  it("chaque sheet de 06 a au moins un cas dans e2e/routes.ts", () => {
    const sansCas = sheetsDe06.filter((sheet) => !sheetsCitees.has(sheet));
    expect(sansCas, `sheets sans cas d'affichage : ${sansCas.join(", ")}`).toEqual([]);
  });

  it("le contrôle lit vraiment le fichier (sinon il passerait sur un fichier vide)", () => {
    expect(routesCitees.size).toBeGreaterThan(10);
    expect(sheetsCitees.size).toBeGreaterThan(10);
  });
});
