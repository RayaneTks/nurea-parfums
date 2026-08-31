import { test, expect } from "@playwright/test";

/** Invariants du pied de page et du tri — complément de `catalogue.spec.ts`. */

test.describe("Catalogue — tri et pied de page", () => {
  test("le tri par marque se reflète dans l'URL et réordonne la grille", async ({
    page,
  }) => {
    /* Rendu serveur : on attend l'interactivité, pas la seule visibilité. */
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("#collection").waitFor({ state: "visible" });

    await page.getByLabel("Trier le catalogue").selectOption("brand");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("sort"))
      .toBe("brand");

    /* La marque est la première ligne imposée de la fiche (charte § 05). */
    const brands = await page
      .locator("#collection button[aria-label] p.nurea-label")
      .allInnerTexts();

    const sorted = [...brands].sort((a, b) =>
      a.localeCompare(b, "fr", { sensitivity: "base" })
    );
    expect(brands).toEqual(sorted);
  });

  test("le pied de page expose les deux canaux de contact", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "WhatsApp" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Snapchat" })).toBeVisible();
  });
});
