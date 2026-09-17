import { describe, expect, it } from "vitest";
import { ADMIN_HOME, loginInput, safeReturnPath } from "../auth";

describe("safeReturnPath — destination après connexion", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/commandes", "/admin/commandes"],
    ["/admin/commandes?doc=abc&edition=1", "/admin/commandes?doc=abc&edition=1"],
    ["/admin?x=1#haut", "/admin?x=1#haut"],
    ["/admin/clients/../compta", "/admin/compta"],
  ])("garde un chemin de la gestion : %s", (input, expected) => {
    expect(safeReturnPath(input)).toBe(expected);
  });

  it.each([
    "//exemple.com",
    "//exemple.com/admin",
    "https://exemple.com",
    "https://exemple.com/admin",
    "/\\exemple.com",
    "/\t/exemple.com/admin",
    "javascript:alert(1)",
    "admin",
    "/",
    "/administration",
    "/admin-sw.js",
    "/admin/../api/perfume-search",
    "/admin/login",
    "/admin/login?retour=/admin",
    "",
  ])("retombe sur l'Accueil : « %s »", (input) => {
    expect(safeReturnPath(input)).toBe(ADMIN_HOME);
  });

  it("une valeur absente ou d'un autre type retombe sur l'Accueil", () => {
    expect(safeReturnPath(undefined)).toBe(ADMIN_HOME);
    expect(safeReturnPath(42)).toBe(ADMIN_HOME);
  });
});

describe("loginInput", () => {
  it("normalise l'identifiant (espaces, casse), jamais le mot de passe", () => {
    const r = loginInput.safeParse({ username: "  Gerant ", password: " secret ", retour: "/admin/vendre" });
    expect(r.success && r.data).toEqual({ username: "gerant", password: " secret ", retour: "/admin/vendre" });
  });

  it("refuse retour=//exemple.com et retour=https://exemple.com sans bloquer la connexion : destination /admin", () => {
    for (const retour of ["//exemple.com", "https://exemple.com"]) {
      const r = loginInput.safeParse({ username: "gerant", password: "x", retour });
      expect(r.success && r.data.retour).toBe("/admin");
    }
  });

  it("sans retour, ou retour d'un type inattendu : /admin", () => {
    expect(loginInput.parse({ username: "gerant", password: "x" }).retour).toBe("/admin");
    expect(loginInput.parse({ username: "gerant", password: "x", retour: ["/admin/compta"] }).retour).toBe("/admin");
  });

  it("champs vides : messages actionnables, en français, sous chaque champ", () => {
    const r = loginInput.safeParse({ username: "   ", password: "" });
    expect(r.success).toBe(false);
    const messages = Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));
    expect(messages).toEqual({ username: "Saisis ton identifiant.", password: "Saisis ton mot de passe." });
  });

  it("champ absent : message français de la carte d'erreurs", () => {
    const r = loginInput.safeParse({});
    expect(r.error?.issues.map((i) => i.message)).toEqual(["Remplis ce champ.", "Remplis ce champ."]);
  });
});
