import type { NextConfig } from "next";
import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { matchHas, prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";

// Spécificateur élargi en `string` : TypeScript n'a pas de déclaration pour un `.mjs`, Vitest le charge.
const { default: nextConfig } = (await import("../../next.config.mjs" as string)) as { default: NextConfig };

/**
 * Chaque ancienne adresse aboutit à une route de l'inventaire de docs/refonte/06-ECRANS-PARCOURS.md
 * §1.2, avec des paramètres que cette route reconnaît (04 §2.3, 06 §1.6, amendement A-3).
 *
 * Les redirections sont rejouées avec les fonctions de correspondance de Next lui-même (mêmes options
 * que `server/lib/router-utils/filesystem.js`) : une redirection peut en chaîner une autre, comme
 * dans le navigateur.
 */

type Redirect = {
  source: string;
  destination: string;
  permanent?: boolean;
  has?: { type: "query"; key: string; value?: string }[];
};

/** Paramètres de sheet acceptés sur toute route du shell (06 §1.2, §1.3). */
const SHEET_PARAMS = ["doc", "edition"];

/** 06 §1.2 : route → paramètres d'URL reconnus (hors paramètres de sheet). */
const INVENTORY: Record<string, { params: string[]; shell: boolean }> = {
  "/admin": { params: [], shell: true },
  "/admin/journee": { params: ["jour"], shell: true },
  "/admin/compta": { params: ["vue", "periode", "ref", "q", "filtre"], shell: true },
  "/admin/compta/journal": { params: ["mois", "poche"], shell: true },
  "/admin/lots": { params: ["q", "pages"], shell: true },
  "/admin/lots/[id]": { params: ["assigner"], shell: true },
  "/admin/lots/nouveau": { params: [], shell: true },
  "/admin/statistiques": { params: ["periode", "ref"], shell: true },
  "/admin/reglages": { params: [], shell: true },
  "/admin/commandes": { params: ["vue", "filtre", "q"], shell: true },
  "/admin/vendre": { params: ["mode", "client", "parfum", "depuis"], shell: true },
  "/admin/clients": { params: ["q"], shell: true },
  "/admin/encaisser": { params: ["anciennete", "q"], shell: true },
  "/admin/clients/[id]": { params: [], shell: true },
  "/admin/clients/[id]/modifier": { params: [], shell: true },
  "/admin/clients/nouveau": { params: ["nom"], shell: true },
  "/admin/catalogue": { params: ["tab", "q", "stock", "visibilite"], shell: true },
  "/admin/catalogue/parfums/[id]": { params: [], shell: true },
  "/admin/catalogue/parfums/[id]/modifier": { params: [], shell: true },
  "/admin/catalogue/parfums/nouveau": { params: ["dupliquer"], shell: true },
  "/admin/catalogue/marques/[id]/modifier": { params: [], shell: true },
  "/admin/catalogue/marques/nouvelle": { params: [], shell: true },
  "/admin/login": { params: ["retour"], shell: false },
};

const INVENTORY_MATCHERS = Object.entries(INVENTORY).map(([route, spec]) => ({
  route,
  spec,
  match: getPathMatch(route.replace(/\[(\w+)\]/g, ":$1"), { strict: true, removeUnnamedParams: true }),
}));

function inventoryRoute(pathname: string) {
  return INVENTORY_MATCHERS.find((entry) => entry.match(pathname) !== false) ?? null;
}

type Url = { pathname: string; query: Record<string, string> };

function parse(url: string): Url {
  const parsed = new URL(url, "http://nurea.test");
  return { pathname: parsed.pathname, query: Object.fromEntries(parsed.searchParams) };
}

function format(url: Url): string {
  const search = new URLSearchParams(url.query).toString();
  return search ? `${url.pathname}?${search}` : url.pathname;
}

/** Une étape de redirection telle que Next la rejoue : première règle qui correspond. */
function step(rules: Redirect[], url: Url): { url: Url; rule: Redirect } | null {
  for (const rule of rules) {
    const params = getPathMatch(rule.source, { strict: true, removeUnnamedParams: true })(url.pathname);
    if (params === false) continue;
    let all: Record<string, unknown> = params;
    if (rule.has) {
      const hasParams = matchHas({ headers: {}, cookies: {} } as never, url.query, rule.has);
      if (!hasParams) continue;
      all = { ...params, ...hasParams };
    }
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params: all as Record<string, string>,
      query: url.query,
    });
    const query = Object.fromEntries(
      Object.entries(parsedDestination.query).map(([key, value]) => [key, String(value)]),
    );
    return { url: { pathname: parsedDestination.pathname ?? "/", query }, rule };
  }
  return null;
}

function follow(rules: Redirect[], start: string): { final: Url; hops: string[] } {
  let url = parse(start);
  const hops = [format(url)];
  for (let i = 0; i < 10; i += 1) {
    const next = step(rules, url);
    if (!next) return { final: url, hops };
    url = next.url;
    hops.push(format(url));
  }
  throw new Error(`Boucle de redirections depuis ${start} : ${hops.join(" → ")}`);
}

/** Une adresse d'exemple pour chaque règle : ses segments variables valent « abc ». */
function sampleFor(rule: Redirect): string {
  const pathname = rule.source.replace(/:(\w+)\*?/g, "abc");
  const query = new URLSearchParams();
  for (const condition of rule.has ?? []) {
    const literal = condition.value && /^[\w-]+$/.test(condition.value) ? condition.value : "abc";
    query.set(condition.key, literal);
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

const rules = (await nextConfig.redirects?.()) as Redirect[];

describe("redirections des anciennes adresses (04 §2.3, 06 §1.6, A-3)", () => {
  it("existent et sont toutes permanentes", () => {
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.filter((rule) => rule.permanent !== true).map((rule) => rule.source)).toEqual([]);
  });

  it("chaque destination déclarée appartient à l'inventaire de 06 §1.2 ou est elle-même redirigée", () => {
    const orphans = rules.flatMap((rule) => {
      const destination = parse(rule.destination.replace(/:(\w+)\*?/g, "abc"));
      const target = inventoryRoute(destination.pathname);
      if (target) {
        const accepted = new Set([...target.spec.params, ...(target.spec.shell ? SHEET_PARAMS : [])]);
        const unknown = Object.keys(destination.query).filter((key) => !accepted.has(key));
        return unknown.length ? [`${rule.destination} : paramètre(s) non reconnu(s) par ${target.route} : ${unknown.join(", ")}`] : [];
      }
      return step(rules, destination) ? [] : [`${rule.source} → ${rule.destination} : hors inventaire`];
    });
    expect(orphans).toEqual([]);
  });

  it("chaque ancienne adresse aboutit, sans boucle, à une route de l'inventaire", () => {
    const lost = rules.flatMap((rule) => {
      const { final, hops } = follow(rules, sampleFor(rule));
      return inventoryRoute(final.pathname) ? [] : [hops.join(" → ")];
    });
    expect(lost).toEqual([]);
  });

  it.each([
    ["/admin/ordres/abc", "/admin/commandes?doc=abc"],
    ["/admin/ordres/abc/edit", "/admin/commandes?doc=abc&edition=1"],
    ["/admin/ordres/new", "/admin/vendre?mode=commande"],
    ["/admin/ordres", "/admin/commandes"],
    ["/admin/compta/ventes/abc/modifier", "/admin/compta?doc=abc&edition=1"],
    ["/admin/perfumes/12/edit", "/admin/catalogue/parfums/12/modifier"],
    ["/admin/brands/new", "/admin/catalogue/marques/nouvelle"],
    ["/admin/stats/top-parfums", "/admin/statistiques"],
    ["/admin/offline", "/admin"],
    ["/admin/ordres?filter=ready", "/admin/commandes?filter=ready&filtre=confirmees"],
    ["/admin/vendre?fromOrder=abc", "/admin/commandes?fromOrder=abc&doc=abc"],
    ["/admin/catalogue?tab=brands&stock=low", "/admin/catalogue?tab=marques&stock=bas"],
  ])("%s → %s", (from, to) => {
    const { final } = follow(rules, from);
    expect(format(final)).toBe(format(parse(to)));
  });

  it("les adresses de travail ne sont jamais redirigées", () => {
    const redirected = Object.keys(INVENTORY)
      .map((route) => route.replace(/\[(\w+)\]/g, "abc"))
      .filter((pathname) => step(rules, parse(pathname)) !== null);
    expect(redirected).toEqual([]);
  });
});
