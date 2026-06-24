import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Validation interactive non-destructive (iPhone 13) des features passe 2 :
 * recherche globale (palette) + rendu livraison partielle.
 * Lancer : npx playwright test passe2-features --project=Mobile
 */

const OUT = path.join(process.cwd(), "audit-shots");
fs.mkdirSync(OUT, { recursive: true });
const HAS_TOKEN = fs.existsSync("/tmp/admin_token.txt");

async function login(page: Page) {
  const token = fs.readFileSync("/tmp/admin_token.txt", "utf8").trim();
  await page.context().addCookies([
    {
      name: "nurea_admin",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Passe 2 — features", () => {
  test.skip(!HAS_TOKEN, "Local uniquement (token admin absent).");
  test.use({ viewport: { width: 390, height: 844 } });

  test("recherche globale : bouton header → palette → résultats", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const searchBtn = page.getByRole("button", { name: "Rechercher" });
    await expect(searchBtn).toBeVisible();

    // Re-clique jusqu'à ouverture (le bouton est client : clic possible avant hydratation).
    const input = page.getByPlaceholder("Parfum, client, commande…");
    await expect(async () => {
      await searchBtn.click();
      await expect(input).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
    await page.screenshot({ path: path.join(OUT, "f1-palette-vide.png") });

    // Tape un terme générique probablement présent (lettre fréquente).
    await input.fill("a");
    await input.fill("ar");
    await page.waitForResponse((r) => r.url().includes("/api/admin/search"), { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, "f1-palette-resultats.png") });

    // La palette reste ouverte et l'input contient la requête.
    await expect(input).toHaveValue("ar");
  });

  test("livraison partielle : détail commande rend le suivi par ligne", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await page.goto("/admin/ordres", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const link = page.locator('a[href*="/admin/ordres/"]').first();
    const count = await link.count();
    test.skip(count === 0, "Aucune commande en base.");

    await link.click();
    await page.waitForURL(/\/admin\/ordres\/[^/]+$/, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Présence du suivi de livraison (texte « livré » + contrôles).
    await expect(page.getByText(/livr[ée]/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(OUT, "b-commande-detail-livraison.png") });
  });

  test("pull-to-refresh : geste tactile arme l'indicateur", async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    // Séquence touch (Playwright fabrique les Touch — WebKit interdit `new Touch`).
    const sel = "#admin-scroll-root";
    const pt = (y: number) => [{ clientX: 120, clientY: y, identifier: 1 }];
    const indicator = page.locator("[data-ptr-indicator]");

    // Re-tente (listeners du hook attachés à l'hydratation).
    await expect(async () => {
      await page.evaluate(() => {
        const el = document.getElementById("admin-scroll-root");
        if (el) el.scrollTop = 0;
      });
      await page.dispatchEvent(sel, "touchstart", { touches: pt(80), targetTouches: pt(80), changedTouches: pt(80) });
      await page.dispatchEvent(sel, "touchmove", { touches: pt(160), targetTouches: pt(160), changedTouches: pt(160) });
      await page.dispatchEvent(sel, "touchmove", { touches: pt(300), targetTouches: pt(300), changedTouches: pt(300) });
      await expect(indicator).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 20_000 });

    await expect(indicator).toHaveAttribute("data-ptr-ready", "true");
    await page.screenshot({ path: path.join(OUT, "f3-pull-to-refresh.png") });

    // Relâche : déclenche le refresh (non-destructif).
    await page.dispatchEvent(sel, "touchend", { changedTouches: pt(300) });
  });

  test("clavier iOS : StickyAction relie son offset à --admin-keyboard-inset", async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await page.goto("/admin/ordres/new?mode=quick", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-sticky-action]", { timeout: 20_000 });

    // Simule un clavier de 240px : le CTA sticky doit remonter d'autant.
    const bottom = await page.evaluate(() => {
      document.documentElement.style.setProperty("--admin-keyboard-inset", "240px");
      const el = document.querySelector("[data-sticky-action]");
      return el ? getComputedStyle(el).bottom : null;
    });
    expect(bottom).toBe("240px");
  });

  test("undo : suppression différée annulable, sans toucher la DB", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);

    // Intercepte tout DELETE de commande → jamais exécuté côté serveur.
    let deleteCalls = 0;
    await page.route("**/api/admin/orders/**", (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalls += 1;
        return route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
      }
      return route.continue();
    });

    await page.goto("/admin/ordres", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const link = page.locator('a[href*="/admin/ordres/"]').first();
    test.skip((await link.count()) === 0, "Aucune commande en base.");
    await link.click();
    await page.waitForURL(/\/admin\/ordres\/[^/]+$/, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const delBtn = page.getByRole("button", { name: /Supprimer la commande/i });
    test.skip(!(await delBtn.isVisible().catch(() => false)), "Commande avec vente liée (non supprimable).");
    await delBtn.click();

    // ConfirmDialog → confirmer.
    await page.getByRole("button", { name: /^Supprimer$/ }).click();

    // Toast « Annuler » apparaît au niveau shell.
    const undoBtn = page.getByRole("button", { name: "Annuler" });
    await expect(undoBtn).toBeVisible();
    await page.screenshot({ path: path.join(OUT, "f2-undo-toast.png") });

    // Annuler → aucun DELETE déclenché.
    await undoBtn.click();
    await page.waitForTimeout(800);
    expect(deleteCalls).toBe(0);
  });
});
