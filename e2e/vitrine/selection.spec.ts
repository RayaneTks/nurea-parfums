import type { Page } from "@playwright/test";
import { test, expect } from "./test";
import { waitForHydration } from "../helpers/hydration";

/**
 * « Ma sélection » (04-PLAN-EXECUTION § T13) : les cœurs des cartes gardent des parfums sur
 * l'appareil, la barre les compte, la feuille les liste et un seul message Snapchat les commande.
 * État vide = invitation à parcourir. Le cœur de la barre ouvre la feuille depuis toute page.
 */

const selectionSheet = (page: Page) => page.getByRole("dialog", { name: "Ma sélection" });
const navHeart = (page: Page) => page.getByRole("banner").getByRole("button", { name: /^Ma sélection/ });

async function home(page: Page, path = "/") {
  await page.addInitScript(() => {
    const copied: string[] = [];
    (window as unknown as { __copied: string[] }).__copied = copied;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => void copied.push(text) },
    });
  });
  await page.context().route(/snapchat\.com/, (route) => route.abort());
  await page.goto(path, { waitUntil: "networkidle" });
}

/** Garde les `n` premiers parfums de la grille ; rendu serveur : on attend l'interactivité. */
async function keep(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const heart = page.getByRole("button", { name: /^Ajouter .+ à ma sélection$/ }).first();
    /* Un cœur est une bascule : un second clic retirerait le parfum. */
    await waitForHydration(heart);
    await heart.click();
    await expect(navHeart(page)).toHaveAccessibleName(`Ma sélection, ${i + 1} parfum${i ? "s" : ""}`);
  }
}

async function openSelection(page: Page) {
  await waitForHydration(navHeart(page));
  await navHeart(page).click();
  await expect(selectionSheet(page)).toBeVisible();
}

test.describe("Ma sélection", () => {
  test("vide, la feuille invite à parcourir, et y ramène", async ({ page }) => {
    await home(page);
    await openSelection(page);
    await expect(selectionSheet(page).getByText("Gardez ici les parfums qui vous tentent.")).toBeVisible();
    await expect(selectionSheet(page).locator('a[href*="snapchat"]')).toHaveCount(0);
    await selectionSheet(page).getByRole("button", { name: "Parcourir le catalogue" }).click();
    await expect(selectionSheet(page)).toBeHidden();
    await expect(page.locator("#collection")).toBeInViewport();
    await expect(page).not.toHaveURL(/selection=/);
  });

  test("trois parfums, un seul message « Nom (Marque) » par ligne", async ({ page }) => {
    await home(page);
    await keep(page, 3);
    await openSelection(page);
    await expect(selectionSheet(page).getByRole("listitem")).toHaveCount(3);

    const order = selectionSheet(page).locator('a[href*="snapchat"]');
    await expect(order).toHaveText(/Commander ces 3 parfums sur Snapchat/);
    const popup = page.waitForEvent("popup");
    await order.click();
    await (await popup).close();
    await expect(order).toHaveText(/Liste copiée/);

    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    expect(copied).toHaveLength(1);
    const lines = copied[0]!.split("\n");
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line).toMatch(/^.+ \(.+\)$/);

    /* Retirer une ligne : la liste, le bouton et la barre suivent. */
    await selectionSheet(page).getByRole("button", { name: /^Retirer .+ de ma sélection$/ }).first().click();
    await expect(selectionSheet(page).getByRole("listitem")).toHaveCount(2);
    await expect(order).toHaveText(/Commander ces 2 parfums sur Snapchat/, { timeout: 3_000 });
    await expect(navHeart(page)).toHaveAccessibleName("Ma sélection, 2 parfums");
  });

  test("la fiche s'ouvre par-dessus, Échap y revient ; la liste survit au rechargement", async ({ page }) => {
    await home(page);
    await keep(page, 2);
    await openSelection(page);
    await selectionSheet(page).getByRole("button", { name: /voir la fiche$/ }).first().click();
    const perfume = page.locator("[data-perfume-sheet]");
    await expect(perfume).toBeVisible();
    /* Échap va à la couche qui tient le focus : attendre qu'il soit entré dans la fiche. */
    await expect.poll(() => perfume.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(perfume).toBeHidden();
    await expect(selectionSheet(page)).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expect(navHeart(page)).toHaveAccessibleName("Ma sélection, 2 parfums");
  });

  test("depuis une autre page, le cœur de la barre ouvre la sélection sur l'accueil", async ({ page }) => {
    await home(page, "/contact");
    await waitForHydration(navHeart(page));
    await navHeart(page).click();
    await expect(page).toHaveURL(/\/\?selection=1/);
    await expect(selectionSheet(page)).toBeVisible();
  });
});
