import type { Page } from "@playwright/test";
import { test, expect } from "./test";

/**
 * Suggestions sous le champ de la barre haute (`SearchBox`) : dès deux caractères, des parfums du
 * catalogue avec leur visuel ; une rangée ouvre la fiche (feuille sur l'accueil, page ailleurs) ;
 * quand rien ne répond, l'invitation à écrire — jamais le vide.
 */

const box = (page: Page) => page.getByRole("combobox", { name: "Rechercher un parfum ou une marque" });
const list = (page: Page) => page.getByRole("listbox", { name: "Suggestions" });
const sheet = (page: Page) => page.getByRole("dialog").filter({ has: page.locator("h2") });

/** Rendu serveur : la frappe doit attendre l'hydratation, sinon React la perd. */
async function type(page: Page, text: string) {
  await expect(async () => {
    await box(page).fill(text);
    await expect(list(page)).toBeVisible({ timeout: 3_000 });
  }).toPass();
}

test.describe("Recherche — suggestions", () => {
  test("sur l'accueil, une suggestion ouvre la fiche sans recharger", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await type(page, "aventus");
    const option = list(page).getByRole("option", { name: /Aventus/ });
    await expect(option).toBeVisible();
    /* Deux variantes du visuel (jour, nuit) : une seule est affichée. */
    await expect(option.locator("img:visible")).toHaveCount(1);
    await option.click();
    await expect(list(page)).toBeHidden();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page)).toContainText("Aventus");
    await expect.poll(() => new URL(page.url()).searchParams.get("parfum")).toMatch(/^\d+$/);
  });

  test("au clavier : flèche bas puis Entrée ouvrent la première suggestion", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await type(page, "aventus");
    await box(page).press("ArrowDown");
    await expect(box(page)).toHaveAttribute("aria-activedescendant", /option-0$/);
    await box(page).press("Enter");
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page)).toContainText("Aventus");
  });

  test("hors accueil, la suggestion est un lien vers la page du parfum", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });
    await type(page, "aventus");
    const link = list(page).getByRole("option", { name: /Aventus/ }); // l'option est le lien
    await expect(link).toHaveAttribute("href", /^\/parfums\/creed\/aventus-\d+$/);
    await expect(list(page).getByRole("option", { name: /^Voir le parfum$/ })).toBeVisible();
  });

  test("une marque propose ses parfums et « Voir les N parfums »", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });
    await type(page, "dior");
    /* Au moins deux parfums Dior, cinq au plus, puis la rangée « Voir les N parfums ». */
    const perfumes = list(page).getByRole("option", { name: /^Dior — / });
    await expect.poll(() => perfumes.count()).toBeGreaterThanOrEqual(2);
    expect(await perfumes.count()).toBeLessThanOrEqual(5);
    const all = list(page).getByRole("option", { name: /^Voir les \d+ parfums$/ });
    await expect(all).toHaveCount(1);
    await expect(all).toHaveAttribute("href", "/?q=dior");
  });

  test("rien de reconnu : jamais le vide, l'invitation à écrire", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "networkidle" });
    await type(page, "zzqqxx");
    const ask = list(page).getByRole("option", { name: /Écrivez-nous/ });
    await expect(ask).toBeVisible();
    await expect(ask).toHaveAttribute("href", "/contact?parfum=zzqqxx");
    await box(page).press("Escape");
    await expect(list(page)).toBeHidden();
  });

  /* Bug du 22/10 en production : sur téléphone, chaque lettre faisait défiler vers le catalogue, et le
     navigateur remontait la page vers le champ de la barre collée — aller-retour à chaque frappe. */
  test("taper ne fait pas bouger la page ; valider amène le catalogue en vue", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await type(page, "di");
    const avant = await page.evaluate(() => scrollY);
    for (const lettre of "or") {
      await box(page).press(lettre);
      await page.waitForTimeout(250);
      expect(await page.evaluate(() => scrollY)).toBe(avant);
    }
    await expect(page.locator("#collection")).not.toBeInViewport();
    await box(page).press("Enter");
    await expect(page.locator("#collection")).toBeInViewport();
    await expect(page.locator("#collection").getByRole("button", { name: /voir comment commander$/ }).first()).toBeVisible();
  });
});
