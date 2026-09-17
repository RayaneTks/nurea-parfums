import { describe, expect, it, vi } from "vitest";
import { read } from "./support/sources";

vi.mock("server-only", () => ({}));

const { MAINTENANCE_HTML, MAINTENANCE_MESSAGE, maintenanceResponse } = await import("@/server/core/maintenance");

/**
 * Page de maintenance de la gestion (07 §1.4 L2, amendement A-11) : servie par `proxy.ts` depuis une
 * constante, et copiée dans `public/admin-maintenance.html`. Les deux ne doivent jamais diverger, et la
 * page doit s'afficher sans aucune ressource (le jour J, rien d'autre ne répond).
 */

describe("page de maintenance (A-11)", () => {
  const file = read("public/admin-maintenance.html");

  it("public/admin-maintenance.html est la copie exacte de la page servie par proxy.ts", () => {
    expect(file).toBe(MAINTENANCE_HTML);
  });

  it("est autonome : aucune feuille, aucun script, aucune image, aucune police externes", () => {
    expect(file).not.toMatch(/<link\b/i);
    expect(file).not.toMatch(/<script\b[^>]*\bsrc=/i);
    expect(file).not.toMatch(/<img\b/i);
    expect(file).not.toMatch(/url\(/i);
    expect(file).not.toMatch(/https?:\/\//i);
    expect(file).toMatch(/<html lang="fr">/);
    expect(file).toContain(MAINTENANCE_MESSAGE);
    expect(file).toMatch(/min-height:\s*44px/);
  });

  it("répond 503 : page HTML pour /admin/*, ActionResult JSON pour /api/admin/*", async () => {
    const page = maintenanceResponse("/admin/commandes");
    expect(page.status).toBe(503);
    expect(page.headers.get("Content-Type")).toContain("text/html");
    expect(await page.text()).toBe(MAINTENANCE_HTML);

    const api = maintenanceResponse("/api/admin/search");
    expect(api.status).toBe(503);
    expect(await api.json()).toEqual({
      ok: false,
      error: { code: "UNAVAILABLE", message: MAINTENANCE_MESSAGE, retryable: true },
    });
  });
});
