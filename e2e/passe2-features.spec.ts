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

    const searchBtn = page.getByRole("button", { name: "Rechercher" });
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();

    const input = page.getByPlaceholder("Parfum, client, commande…");
    await expect(input).toBeVisible();
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
});
