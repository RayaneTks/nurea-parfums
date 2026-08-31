import { describe, expect, it } from "vitest";
import { ADMIN_TABS, getParentScreen } from "../navigation";

describe("ADMIN_TABS", () => {
  it("compte cinq destinations — au-delà, les libellés se tronquent (HIG iOS)", () => {
    expect(ADMIN_TABS).toHaveLength(5);
  });

  it("rattache chaque route de l'app à exactement un onglet", () => {
    const routes = [
      "/admin",
      "/admin/clients",
      "/admin/clients/abc",
      "/admin/stats/top-parfums",
      "/admin/offline",
      "/admin/ordres",
      "/admin/ordres/new",
      "/admin/ordres/abc",
      "/admin/vendre",
      "/admin/compta",
      "/admin/lots",
      "/admin/lots/abc",
      "/admin/catalogue",
      "/admin/perfumes/new",
      "/admin/brands/abc/edit",
    ];
    for (const route of routes) {
      const matches = ADMIN_TABS.filter((tab) => tab.match(route));
      expect(matches.map((m) => m.label), `route ${route}`).toHaveLength(1);
    }
  });
});

describe("getParentScreen", () => {
  it("n'affiche aucun retour sur une racine d'onglet", () => {
    for (const tab of ADMIN_TABS) {
      expect(getParentScreen(tab.href), tab.href).toBeNull();
    }
  });

  it("ramène une page d'édition à sa propre fiche, pas à la liste", () => {
    expect(getParentScreen("/admin/clients/cust_1/edit")).toEqual({
      href: "/admin/clients/cust_1",
      label: "Fiche client",
    });
    expect(getParentScreen("/admin/ordres/ord_1/edit")).toEqual({
      href: "/admin/ordres/ord_1",
      label: "Commande",
    });
  });

  it("ramène un détail à sa liste", () => {
    expect(getParentScreen("/admin/clients/cust_1")).toEqual({
      href: "/admin/clients",
      label: "Clients",
    });
    expect(getParentScreen("/admin/ordres/ord_1")).toEqual({
      href: "/admin/ordres",
      label: "Commandes",
    });
    expect(getParentScreen("/admin/lots/lot_1")).toEqual({
      href: "/admin/lots",
      label: "Lots",
    });
  });

  it("rattache les écrans du catalogue au bon onglet parent", () => {
    expect(getParentScreen("/admin/perfumes/new")?.href).toBe("/admin/catalogue");
    expect(getParentScreen("/admin/brands/b_1/edit")?.href).toBe("/admin/catalogue?tab=brands");
  });

  it("ne se retourne jamais vers lui-même", () => {
    const routes = [
      "/admin/clients",
      "/admin/lots",
      "/admin/clients/c1",
      "/admin/clients/c1/edit",
      "/admin/ordres/o1/edit",
    ];
    for (const route of routes) {
      expect(getParentScreen(route)?.href, route).not.toBe(route);
    }
  });
});
