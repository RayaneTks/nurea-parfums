import type { NextConfig } from "next";
import { describe, expect, it } from "vitest";
import {
  ADMIN_TABS,
  allowsPullToRefresh,
  createTabMemory,
  getParentScreen,
  hasActiveFilters,
  onTabPress,
  resolveBack,
  tabOf,
  type TabId,
  type TabPressContext,
} from "../navigation";
import { ROUTE_SPECS, matchesPattern, routeOf, routes, withSheet } from "../routes";

/**
 * Les sept tests exigés par docs/refonte/06-ECRANS-PARCOURS.md §1.4. L'inventaire ci-dessous est
 * recopié de 06 §1.2 (onglet et parent de chaque route) : c'est lui qui juge `navigation.ts`, et non
 * l'inverse.
 */

type Row = { screen: string; example: string; tab: TabId | null; parent: string | null };

const INVENTORY: Row[] = [
  { screen: "E01", example: "/admin", tab: "accueil", parent: null },
  { screen: "E02", example: "/admin/journee", tab: "accueil", parent: "/admin" },
  { screen: "E03", example: "/admin/compta", tab: "accueil", parent: "/admin" },
  { screen: "E04", example: "/admin/compta/journal", tab: "accueil", parent: "/admin/compta?vue=tresorerie" },
  { screen: "E05", example: "/admin/lots", tab: "accueil", parent: "/admin" },
  { screen: "E06", example: "/admin/lots/lot_1", tab: "accueil", parent: "/admin/lots" },
  { screen: "E07", example: "/admin/statistiques", tab: "accueil", parent: "/admin" },
  { screen: "E08", example: "/admin/reglages", tab: "accueil", parent: "/admin" },
  { screen: "E10", example: "/admin/commandes", tab: "commandes", parent: null },
  { screen: "E11", example: "/admin/vendre", tab: "vendre", parent: null },
  { screen: "E12", example: "/admin/clients", tab: "clients", parent: null },
  { screen: "E13", example: "/admin/encaisser", tab: "clients", parent: "/admin/clients" },
  { screen: "E14", example: "/admin/clients/cus_1", tab: "clients", parent: "/admin/clients" },
  { screen: "E15", example: "/admin/catalogue", tab: "catalogue", parent: null },
  { screen: "E16", example: "/admin/catalogue/parfums/12", tab: "catalogue", parent: "/admin/catalogue?tab=parfums" },
  { screen: "E17", example: "/admin/catalogue/marques/br_1/modifier", tab: "catalogue", parent: "/admin/catalogue?tab=marques" },
  { screen: "E17", example: "/admin/catalogue/marques/nouvelle", tab: "catalogue", parent: "/admin/catalogue?tab=marques" },
  { screen: "E18", example: "/admin/login", tab: null, parent: null },
  { screen: "E19", example: "/admin/catalogue/parfums/12/modifier", tab: "catalogue", parent: "/admin/catalogue/parfums/12" },
  { screen: "E19", example: "/admin/catalogue/parfums/nouveau", tab: "catalogue", parent: "/admin/catalogue?tab=parfums" },
  { screen: "E20", example: "/admin/clients/cus_1/modifier", tab: "clients", parent: "/admin/clients/cus_1" },
  { screen: "E20", example: "/admin/clients/nouveau", tab: "clients", parent: "/admin/clients" },
  { screen: "E21", example: "/admin/lots/nouveau", tab: "accueil", parent: "/admin/lots" },
];

const SHELL_ROUTES = INVENTORY.filter((row) => row.tab !== null);
const ROOTS = ["/admin", "/admin/commandes", "/admin/vendre", "/admin/clients", "/admin/catalogue"];

describe("1. les cinq onglets", () => {
  it("sont exactement cinq, dans l'ordre de 06 §1.1, Vendre seul accentué", () => {
    expect(ADMIN_TABS.map((tab) => [tab.label, tab.href])).toEqual([
      ["Accueil", "/admin"],
      ["Commandes", "/admin/commandes"],
      ["Vendre", "/admin/vendre"],
      ["Clients", "/admin/clients"],
      ["Catalogue", "/admin/catalogue"],
    ]);
    expect(ADMIN_TABS.filter((tab) => tab.emphasis).map((tab) => tab.id)).toEqual(["vendre"]);
  });
});

describe("2. une route, un onglet", () => {
  it("chaque route de l'inventaire de 06 §1.2 appartient à exactement un onglet (E18 à aucun)", () => {
    for (const row of INVENTORY) {
      const owners = ADMIN_TABS.filter((tab) => tab.match(row.example)).map((tab) => tab.id);
      expect(owners, row.example).toEqual(row.tab ? [row.tab] : []);
      expect(tabOf(row.example), row.example).toBe(row.tab);
    }
  });

  it("l'inventaire de routes.ts est celui de 06 §1.2, et chaque constructeur tombe dans un seul onglet", () => {
    const covered = INVENTORY.map((row) => routeOf(row.example)?.spec.screen);
    expect(covered).toEqual(INVENTORY.map((row) => row.screen));
    expect(new Set(Object.values(ROUTE_SPECS).map((spec) => spec.screen))).toEqual(new Set(INVENTORY.map((row) => row.screen)));

    const samples: Record<keyof typeof routes, string> = {
      accueil: routes.accueil(),
      journee: routes.journee({ jour: "2026-09-17" }),
      compta: routes.compta({ vue: "tresorerie" }),
      journal: routes.journal({ mois: "2026-09" }),
      lots: routes.lots(),
      lot: routes.lot("lot_1", { assigner: true }),
      nouveauLot: routes.nouveauLot(),
      statistiques: routes.statistiques({ periode: "mois" }),
      reglages: routes.reglages(),
      commandes: routes.commandes({ filtre: "retard" }),
      vendre: routes.vendre({ mode: "commande" }),
      clients: routes.clients({ q: "fa" }),
      encaisser: routes.encaisser({ anciennete: 30 }),
      client: routes.client("cus_1"),
      modifierClient: routes.modifierClient("cus_1"),
      nouveauClient: routes.nouveauClient({ nom: "Lina" }),
      catalogue: routes.catalogue({ tab: "marques" }),
      parfum: routes.parfum(12),
      modifierParfum: routes.modifierParfum(12),
      nouveauParfum: routes.nouveauParfum({ dupliquer: 12 }),
      modifierMarque: routes.modifierMarque("br_1"),
      nouvelleMarque: routes.nouvelleMarque(),
      connexion: routes.connexion({ retour: "/admin/vendre" }),
      document: routes.document({ id: "doc_1", origin: "ORDER" }),
    };
    for (const [name, url] of Object.entries(samples)) {
      const expected = name === "connexion" ? [] : [expect.any(String)];
      const owners = ADMIN_TABS.filter((tab) => tab.match(new URL(url, "http://n").pathname)).map((tab) => tab.id);
      expect(owners, `${name} → ${url}`).toEqual(expected);
    }
  });
});

describe("3. règle du même trajet", () => {
  it("le parent d'une route est dans le même onglet qu'elle", () => {
    for (const row of SHELL_ROUTES) {
      const parent = getParentScreen(row.example);
      if (!parent) continue;
      expect(tabOf(parent.href), `${row.example} → ${parent.href}`).toBe(tabOf(row.example));
    }
  });

  it("le parent de chaque route est celui de 06 §1.2", () => {
    for (const row of INVENTORY) {
      expect(getParentScreen(row.example)?.href ?? null, row.example).toBe(row.parent);
    }
  });
});

describe("4. racines et parents", () => {
  it("aucune racine n'a de parent ; toute autre route du shell en a un ; E18 est hors shell", () => {
    for (const row of SHELL_ROUTES) {
      const parent = getParentScreen(row.example);
      if (ROOTS.includes(row.example)) expect(parent, row.example).toBeNull();
      else expect(parent, row.example).not.toBeNull();
    }
    expect(getParentScreen(routes.connexion())).toBeNull();
    expect(tabOf(routes.connexion())).toBeNull();
  });

  it("aucune route n'est son propre parent", () => {
    for (const row of SHELL_ROUTES) {
      const parent = getParentScreen(row.example);
      if (parent) expect(new URL(parent.href, "http://n").pathname, row.example).not.toBe(row.example);
    }
  });
});

describe("5. les paramètres de sheet ne changent rien", () => {
  it("?doc=, &edition=1 et ?assigner=1 laissent onglet et parent inchangés", () => {
    for (const row of SHELL_ROUTES) {
      const variants = [
        withSheet(row.example, { doc: "doc_1" }),
        withSheet(row.example, { doc: "doc_1", edition: true }),
        withSheet(row.example, { assigner: true }),
        withSheet(`${row.example}?q=fa`, { doc: "doc_1" }),
      ];
      for (const url of variants) {
        expect(tabOf(url), url).toBe(tabOf(row.example));
        expect(getParentScreen(url), url).toEqual(getParentScreen(row.example));
      }
    }
  });
});

describe("6. redirections", () => {
  it("chaque redirection de next.config.mjs aboutit à une route de l'inventaire, dans un onglet", async () => {
    const { default: config } = (await import("../../../next.config.mjs" as string)) as { default: NextConfig };
    const rules = (await config.redirects?.()) ?? [];
    expect(rules.length).toBeGreaterThan(0);
    const lost = rules.flatMap((rule) => {
      const destination = rule.destination.replace(/:(\w+)\*?/g, "abc");
      // Une destination peut être elle-même redirigée (/admin/commandes/abc → ?doc=abc) : on suit la chaîne.
      let url = new URL(destination, "http://n");
      for (let hop = 0; hop < 5; hop += 1) {
        const next = rules.find((r) => !r.has && matchesPattern(url.pathname, r.source.replace(/:(\w+)\*?/g, "[$1]")));
        if (!next) break;
        url = new URL(next.destination.replace(/:(\w+)\*?/g, "abc"), "http://n");
      }
      const route = routeOf(url.pathname);
      const inTab = route !== null && route.spec.shell && tabOf(url.pathname) !== null;
      return inTab ? [] : [`${rule.source} → ${destination} (fin : ${url.pathname})`];
    });
    expect(lost).toEqual([]);
  });
});

describe("7. onTabPress : table de vérité de 06 §1.5", () => {
  const ctx = (over: Partial<TabPressContext>): TabPressContext => ({
    activeTab: "commandes",
    sheetOpen: false,
    isRoot: true,
    scrollTop: 0,
    rootHasFilters: false,
    ...over,
  });

  it("onglet inactif jamais visité : sa racine, en haut", () => {
    const memory = createTabMemory();
    expect(onTabPress("clients", ctx({}), memory)).toEqual({ kind: "restore", url: "/admin/clients", scrollTop: 0 });
  });

  it("onglet inactif : son dernier écran, filtres et défilement, sans paramètre de sheet", () => {
    const memory = createTabMemory();
    memory.remember("clients", "/admin/clients?q=fa", 120);
    memory.remember("clients", "/admin/clients/cus_1?doc=doc_9", 340);
    expect(onTabPress("clients", ctx({ sheetOpen: true, isRoot: false, scrollTop: 50, rootHasFilters: true }), memory)).toEqual({
      kind: "restore",
      url: "/admin/clients/cus_1",
      scrollTop: 340,
    });
  });

  // Onglet actif : chaque ligne vérifie que la première condition vraie l'emporte sur les suivantes.
  const TABLE: [string, Partial<TabPressContext>, string][] = [
    ["sheet ouverte (tout le reste vrai)", { sheetOpen: true, isRoot: false, scrollTop: 400, rootHasFilters: true }, "closeSheet"],
    ["sheet ouverte sur la racine", { sheetOpen: true }, "closeSheet"],
    ["hors racine, défilé et filtré", { isRoot: false, scrollTop: 400, rootHasFilters: true }, "goRoot"],
    ["hors racine", { isRoot: false }, "goRoot"],
    ["racine défilée et filtrée", { scrollTop: 400, rootHasFilters: true }, "scrollTop"],
    ["racine défilée", { scrollTop: 1 }, "scrollTop"],
    ["racine en haut, filtrée", { rootHasFilters: true }, "resetFilters"],
    ["racine en haut, sans filtre", {}, "none"],
  ];
  it.each(TABLE)("onglet actif — %s → %s", (_label, over, kind) => {
    expect(onTabPress("commandes", ctx(over), createTabMemory()).kind).toBe(kind);
  });

  it("retour à la racine : avec ses filtres et son défilement mémorisés", () => {
    const memory = createTabMemory();
    memory.remember("clients", "/admin/clients?q=fa", 220);
    memory.remember("clients", "/admin/clients/cus_1", 0);
    expect(onTabPress("clients", ctx({ activeTab: "clients", isRoot: false }), memory)).toEqual({
      kind: "goRoot",
      url: "/admin/clients?q=fa",
      scrollTop: 220,
    });
  });

  it("filtres effacés : la racine nue", () => {
    expect(onTabPress("catalogue", ctx({ activeTab: "catalogue", rootHasFilters: true }), createTabMemory())).toEqual({
      kind: "resetFilters",
      url: "/admin/catalogue",
    });
  });

  it("filtres par onglet : recherche et vues filtrent, le pré-remplissage de Vendre non", () => {
    expect(hasActiveFilters("commandes", "?filtre=retard")).toBe(true);
    expect(hasActiveFilters("commandes", "?doc=abc")).toBe(false);
    expect(hasActiveFilters("clients", "?q=")).toBe(false);
    expect(hasActiveFilters("catalogue", "?tab=marques")).toBe(true);
    expect(hasActiveFilters("vendre", "?mode=commande&client=cus_1")).toBe(false);
  });
});

describe("retour qui restitue le contexte du parent (06 §1.5)", () => {
  it("E06 → E05 à la même position", () => {
    const memory = createTabMemory();
    memory.remember("accueil", "/admin/lots", 480);
    memory.remember("accueil", "/admin/lots/lot_1", 0);
    const parent = getParentScreen("/admin/lots/lot_1");
    expect(parent && resolveBack(parent, memory)).toEqual({ url: "/admin/lots", scrollTop: 480 });
  });

  it("garde les filtres du parent, sauf s'ils contredisent l'écran qu'annonce le retour", () => {
    const memory = createTabMemory();
    memory.remember("catalogue", "/admin/catalogue?tab=marques&q=dior", 90);
    const toMarques = getParentScreen("/admin/catalogue/marques/nouvelle");
    const toCatalogue = getParentScreen("/admin/catalogue/parfums/nouveau");
    expect(toMarques && resolveBack(toMarques, memory)).toEqual({ url: "/admin/catalogue?tab=marques&q=dior", scrollTop: 90 });
    expect(toCatalogue && resolveBack(toCatalogue, memory)).toEqual({ url: "/admin/catalogue?tab=parfums", scrollTop: 0 });
  });

  it("parent jamais visité : son adresse, en haut", () => {
    const parent = getParentScreen("/admin/compta/journal");
    expect(parent && resolveBack(parent, createTabMemory())).toEqual({ url: "/admin/compta?vue=tresorerie", scrollTop: 0 });
  });
});

describe("pull-to-refresh : routes de lecture seulement", () => {
  it("jamais sur Vendre, les formulaires ni la connexion", () => {
    expect(allowsPullToRefresh("/admin")).toBe(true);
    expect(allowsPullToRefresh("/admin/commandes?doc=x")).toBe(true);
    expect(allowsPullToRefresh("/admin/clients/cus_1")).toBe(true);
    for (const form of [
      "/admin/vendre",
      "/admin/catalogue/marques/nouvelle",
      "/admin/catalogue/marques/br_1/modifier",
      "/admin/catalogue/parfums/nouveau",
      "/admin/catalogue/parfums/12/modifier",
      "/admin/clients/nouveau",
      "/admin/clients/cus_1/modifier",
      "/admin/lots/nouveau",
      "/admin/login",
    ]) {
      expect(allowsPullToRefresh(form), form).toBe(false);
    }
  });
});
