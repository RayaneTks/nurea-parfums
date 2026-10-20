import { test, expect, type Page } from "@playwright/test";

/**
 * Filtres du catalogue (04-PLAN-EXECUTION § B, T11) : la feuille « Marques » annonce le nombre de
 * parfums avant validation, la grille ne bouge qu'à la validation, chaque marque cochée devient une
 * puce qui se retire seule, et tout tient dans l'adresse.
 */

/** Le nombre affiché par la barre d'outils (« 12 parfums »). */
async function gridCount(page: Page): Promise<number> {
  const text = await page.locator("#collection").getByText(/^\d+ parfums?$/).first().innerText();
  return Number.parseInt(text, 10);
}

async function openBrands(page: Page) {
  /* Rendu serveur : on attend l'interactivité, pas la seule visibilité. */
  await page.goto("/", { waitUntil: "networkidle" });
  const trigger = page.locator("#collection").getByRole("button", { name: /^Marques( · \d+)?$/ });
  const sheet = page.getByRole("dialog", { name: "Filtrer par marque" });
  await expect(async () => {
    await trigger.click();
    await expect(sheet).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return sheet;
}

test.describe("Catalogue — filtres par marque", () => {
  test("le bouton compte les parfums avant validation, la grille suit à la validation", async ({ page }) => {
    const sheet = await openBrands(page);
    const before = await gridCount(page);
    const apply = sheet.getByRole("button", { name: /^Voir \d+ parfums?$/ });
    await expect(apply).toHaveText(`Voir ${before} parfum${before > 1 ? "s" : ""}`);

    const boxes = sheet.locator("label");
    await boxes.nth(0).click();
    const one = Number.parseInt((await apply.innerText()).replace(/\D+/g, ""), 10);
    expect(one).toBeGreaterThan(0);
    expect(one).toBeLessThan(before);

    await boxes.nth(1).click();
    const two = Number.parseInt((await apply.innerText()).replace(/\D+/g, ""), 10);
    expect(two).toBeGreaterThan(one);

    /* Brouillon : rien n'a encore bougé derrière la feuille. */
    expect(await gridCount(page)).toBe(before);

    await apply.click();
    await expect(sheet).toBeHidden();
    await expect.poll(() => gridCount(page)).toBe(two);
    await expect.poll(() => new URL(page.url()).searchParams.get("brands")?.split(",").length).toBe(2);

    /* Une puce par marque ; en retirer une rend le compte de l'autre seule. */
    const chips = page.getByRole("button", { name: /^Retirer le filtre / });
    await expect(chips).toHaveCount(2);
    await chips.nth(1).click();
    await expect(chips).toHaveCount(1);
    await expect.poll(() => gridCount(page)).toBe(one);
    await expect.poll(() => new URL(page.url()).searchParams.get("brands")?.split(",").length).toBe(1);
  });

  test("fermer sans valider ne change rien", async ({ page }) => {
    const sheet = await openBrands(page);
    const before = await gridCount(page);
    await sheet.locator("label").first().click();
    await sheet.getByRole("button", { name: "Fermer les filtres" }).click();
    await expect(sheet).toBeHidden();
    expect(await gridCount(page)).toBe(before);
    expect(new URL(page.url()).searchParams.get("brands")).toBeNull();
  });

  test("le tri par marque se reflète dans l'URL et réordonne la grille", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByLabel("Trier le catalogue").selectOption("brand");
    await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("brand");

    /* La marque est la première ligne de la carte. */
    const brands = await page.locator("#collection article .card-brand").allInnerTexts();
    const sorted = [...brands].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    expect(brands).toEqual(sorted);
  });

  test("le pied de page expose le canal de commande", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer").getByRole("link", { name: "Snapchat" })).toBeVisible();
  });
});
