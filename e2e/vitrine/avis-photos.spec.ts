import { test, expect } from "./test";

/**
 * Avis « photos indisponibles » (23/10/2026) : visible seulement si le stockage des visuels ne répond
 * pas, discret (le catalogue reste utilisable), fermable, et absent quand les visuels chargent.
 */
test.describe("Avis photos indisponibles", () => {
  test("absent quand les visuels chargent", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await expect(page.getByText("Les photos des parfums sont momentanément indisponibles.")).toHaveCount(0);
  });

  test("affiché quand le stockage refuse les visuels ; Snapchat et Fermer", async ({ page, context }) => {
    await context.route(/\.supabase\.co\/storage\//, (route) =>
      route.fulfill({ status: 402, contentType: "application/json", body: '{"message":"restricted"}' }),
    );
    await page.goto("/", { waitUntil: "networkidle" });
    const avis = page.getByRole("status").filter({ hasText: "momentanément indisponibles" });
    await expect(avis).toBeVisible();
    await expect(avis.getByRole("link", { name: "Nous écrire sur Snapchat" })).toHaveAttribute("href", /snapchat\.com/);
    await avis.getByRole("button", { name: "Fermer" }).click();
    await expect(avis).toHaveCount(0);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await expect(page.getByText("momentanément indisponibles")).toHaveCount(0);
  });
});
