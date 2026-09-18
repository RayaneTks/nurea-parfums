import { describe, expect, it } from "vitest";
import { ROUTE_SPECS, matchesPattern, routeOf, routes, type RouteName, type RouteSpec } from "@/app-shell/routes";
import { exists, isTestFile, listSources, read, stringLiterals } from "./support/sources";

/**
 * Les URL de la gestion s'écrivent à un seul endroit : `src/app-shell/routes.ts` (04 §2.2, §16.2).
 *
 * - chaque constructeur correspond à un écran de l'inventaire (06 §1.2) ;
 * - un écran livré (définitif ou provisoire) a son `page.tsx`, un écran à venir n'en a pas encore
 *   (sinon son état ment) ;
 * - aucune page de `app/admin` n'échappe à l'inventaire ;
 * - aucune URL d'écran littérale dans les couches d'interface.
 *
 * Portée de la dernière règle : `src/app-shell` (hors `routes.ts` et `navigation.ts`), `src/features`,
 * `src/ui` et `app/admin`. Le socle serveur (`src/server`), les contrats, `proxy.ts` et `src/lib/pwa`
 * écrivent `/admin` ou `/admin/login` en dur : 04 §1.3 leur interdit d'importer le shell.
 */

const PAGE_FILE = /^app\/admin\/.*page\.tsx$/;

/** `app/admin/(gestion)/clients/[id]/page.tsx` pour `/admin/clients/[id]` ; hors shell : `app/admin/login/page.tsx`. */
function pageFileOf(spec: RouteSpec): string {
  const rest = spec.pattern.replace(/^\/admin/, "");
  return spec.shell ? `app/admin/(gestion)${rest}/page.tsx` : `app${spec.pattern}/page.tsx`;
}

function patternOfPageFile(file: string): string {
  const route = file
    .replace(/^app\//, "/")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/\([^)]+\)/g, "")
    .replace(/\/_[^/]+/g, "");
  return route === "" ? "/" : route;
}

const SPECS = Object.entries(ROUTE_SPECS) as [RouteName, RouteSpec][];

describe("constructeurs d'URL (04 §2.2)", () => {
  it("un constructeur par écran de l'inventaire, plus la fiche document", () => {
    expect(Object.keys(routes).sort()).toEqual([...SPECS.map(([name]) => name), "document"].sort());
  });

  it("chaque constructeur produit une URL de son écran, avec des paramètres qu'il reconnaît", () => {
    const calls: Record<RouteName, string> = {
      accueil: routes.accueil(),
      journee: routes.journee({ jour: "2026-09-17" }),
      compta: routes.compta({ vue: "tresorerie", periode: "tout", ref: "2026-09-01", q: "fa", filtre: "cout-a-completer" }),
      journal: routes.journal({ mois: "2026-09", poche: "po_1" }),
      lots: routes.lots({ q: "fa", pages: 2 }),
      lot: routes.lot("lot_1", { assigner: true }),
      nouveauLot: routes.nouveauLot(),
      statistiques: routes.statistiques({ periode: "annee", ref: "2026-01-01", pages: 2 }),
      reglages: routes.reglages(),
      commandes: routes.commandes({ vue: "livrees", filtre: "retard", q: "fa" }),
      vendre: routes.vendre({ mode: "commande", client: "cus_1", parfum: 12, depuis: "doc_1" }),
      clients: routes.clients({ q: "06 12", pages: 2 }),
      encaisser: routes.encaisser({ anciennete: 30, q: "fa" }),
      client: routes.client("cus 1", { pages: 3 }),
      modifierClient: routes.modifierClient("cus_1"),
      nouveauClient: routes.nouveauClient({ nom: "Élise" }),
      catalogue: routes.catalogue({ tab: "marques", q: "dior", stock: "rupture", visibilite: "masques" }),
      parfum: routes.parfum(12),
      modifierParfum: routes.modifierParfum(12),
      nouveauParfum: routes.nouveauParfum({ dupliquer: 12 }),
      modifierMarque: routes.modifierMarque("br_1"),
      nouvelleMarque: routes.nouvelleMarque(),
      connexion: routes.connexion({ retour: "/admin/vendre?mode=commande" }),
    };
    const wrong = SPECS.flatMap(([name, spec]) => {
      const url = new URL(calls[name], "http://nurea.test");
      const found = routeOf(url.pathname);
      const unknown = [...url.searchParams.keys()].filter((key) => !spec.params.includes(key));
      if (found?.name !== name) return [`${name} → ${calls[name]} : écran ${found?.name ?? "hors inventaire"}`];
      return unknown.length ? [`${name} → ${calls[name]} : paramètre(s) inconnu(s) ${unknown.join(", ")}`] : [];
    });
    expect(wrong).toEqual([]);
  });

  it("la fiche document s'ouvre en sheet au-dessus de sa liste d'origine (A-3)", () => {
    expect(routes.document({ id: "abc", origin: "ORDER" })).toBe("/admin/commandes?doc=abc");
    expect(routes.document({ id: "abc", origin: "DIRECT_SALE", edition: true })).toBe("/admin/compta?doc=abc&edition=1");
  });

  it("un filtre vide ou faux ne s'écrit pas", () => {
    expect(routes.clients({ q: "" })).toBe("/admin/clients");
    expect(routes.lot("lot_1", { assigner: false })).toBe("/admin/lots/lot_1");
  });
});

describe("écrans et pages (04 §2.2)", () => {
  for (const [name, spec] of SPECS) {
    const file = pageFileOf(spec);
    if (spec.etat === "a-venir") {
      it(`${name} (${spec.screen}) est à venir : ${file} n'existe pas encore`, () => {
        expect(exists(file), `${file} existe : passer ${name} en « provisoire » ou « livree »`).toBe(false);
      });
      it.todo(`${spec.screen} ${spec.pattern} — livré au jalon ${spec.jalon}`);
    } else {
      it(`${name} (${spec.screen}, ${spec.etat}) a sa page : ${file}`, () => {
        expect(exists(file)).toBe(true);
      });
    }
  }

  it("toute page de app/admin appartient à l'inventaire", () => {
    const pages = listSources("app/admin").filter((file) => PAGE_FILE.test(file));
    const orphans = pages.filter((file) => {
      const pattern = patternOfPageFile(file);
      return !SPECS.some(([, spec]) => spec.pattern === pattern);
    });
    expect(orphans).toEqual([]);
  });

  it("le motif d'une page se lit sur son chemin de fichier", () => {
    expect(patternOfPageFile("app/admin/(gestion)/page.tsx")).toBe("/admin");
    expect(patternOfPageFile("app/admin/(gestion)/clients/[id]/modifier/page.tsx")).toBe("/admin/clients/[id]/modifier");
    expect(patternOfPageFile("app/admin/login/page.tsx")).toBe("/admin/login");
    expect(matchesPattern("/admin/clients/abc", "/admin/clients/[id]")).toBe(true);
  });
});

/** URL d'écran littérale : `/admin`, `/admin/…`, `/admin?…` (et non `/api/admin/…`). */
const ADMIN_URL = /^\/admin(?:[/?#]|$)/;

const URL_SCOPE = ["src/app-shell", "src/features", "src/ui", "app/admin"];
const URL_WRITERS = new Set(["src/app-shell/routes.ts", "src/app-shell/navigation.ts"]);

function literalUrls(source: string): string[] {
  return stringLiterals(source).filter((text) => ADMIN_URL.test(text.trim()));
}

describe("aucune URL d'écran écrite hors routes.ts (04 §2.2)", () => {
  it("les couches d'interface passent par les constructeurs", () => {
    const files = listSources(...URL_SCOPE).filter((file) => !isTestFile(file) && !URL_WRITERS.has(file));
    const found = files.flatMap((file) => literalUrls(read(file)).map((url) => `${file} : « ${url} »`));
    expect(found).toEqual([]);
  });

  it("le contrôle trouve une URL en chaîne et en gabarit, et épargne l'API et le texte", () => {
    const source = [
      'const a = "/admin/commandes";',
      "const b = `/admin/clients/${id}`;",
      'const c = "/api/pwa/admin";',
      'const d = "Administration";',
      "const e = '/admin';",
    ].join("\n");
    expect(literalUrls(source)).toEqual(["/admin/commandes", "/admin/clients/", "/admin"]);
  });
});
