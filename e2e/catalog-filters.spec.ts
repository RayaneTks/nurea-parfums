import { test, expect } from "@playwright/test";

test.describe("Catalogue — filtres", () => {
  test("changer de catégorie ramène le bloc catalogue en haut de fenêtre", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.scrollTo(0, 4800);
    });
    await page.getByRole("button", { name: "Gammes Complètes" }).click();
    await expect
      .poll(async () => {
        return page.locator("#collection").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.top;
        });
      })
      .toBeLessThan(140);
  });

  test("footer : deux liens sociaux visibles avec icônes", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /WhatsApp/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Snapchat/i })).toBeVisible();
  });
});
