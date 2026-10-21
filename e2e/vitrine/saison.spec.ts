import { test, expect } from "./test";
import { waitForHydration } from "../helpers/hydration";
import { moisParis, SAISONS } from "../../src/lib/catalog/saison";

/**
 * Parfums du moment (`SeasonSection`, demande du gérant du 22/10/2026) et glissé des ancres.
 * Hors des mois d'une saison, la section n'existe pas : le test de la section se saute alors.
 */

test.describe("Accueil — parfums du moment", () => {
  test.skip(!SAISONS.some((s) => s.mois.includes(moisParis())), "aucune saison ce mois-ci");

  test("deux rangées repliées, le bouton givré déroule tout, une carte ouvre la fiche", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const section = page.locator("section").filter({ has: page.locator(".saison") });
    const cards = section.getByRole("button", { name: /voir comment commander$/ });
    const toggle = section.getByRole("button", { name: /^Voir les \d+ parfums$/ });

    await waitForHydration(toggle);
    const total = Number((await toggle.innerText()).match(/\d+/)?.[0]);
    const before = await section.locator(".saison > li:visible").count();
    expect(before).toBeLessThan(total);

    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toHaveAttribute("data-gel", "true");
    await toggle.click();
    await expect(section.getByRole("button", { name: "Afficher moins" })).toHaveAttribute("aria-expanded", "true");
    await expect(section.locator(".saison > li:visible")).toHaveCount(total);

    const card = cards.nth(before);
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/[?&]parfum=\d+/);
    const sheet = page.getByRole("dialog").filter({ has: page.locator("h2") });
    await expect(sheet).toBeVisible();
    // Fermée, la fiche rend le focus à la carte de la sélection qui l'a ouverte, pas à celle du catalogue.
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(card).toBeFocused();
  });
});

test("« Voir le catalogue » fait glisser la page jusqu'au catalogue", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  // L'écouteur des ancres naît avec la page : on attend qu'un composant client ait repris la main.
  await waitForHydration(page.getByRole("button", { name: /voir comment commander$/ }).first());
  await page.getByRole("link", { name: "Voir le catalogue" }).click();
  await expect(page).toHaveURL(/#collection$/);
  // Un saut poserait la page d'un coup ; un glissé passe par des positions intermédiaires.
  const positions = await page.evaluate(async () => {
    const ys: number[] = [];
    for (let i = 0; i < 6; i++) {
      ys.push(Math.round(scrollY));
      await new Promise((r) => setTimeout(r, 50));
    }
    return ys;
  });
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById("collection")!.getBoundingClientRect().top))).toBeLessThan(200);
  expect(new Set(positions).size).toBeGreaterThan(1);
});
