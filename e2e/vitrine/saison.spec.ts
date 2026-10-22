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
  // Un saut pose la page d'un coup ; un glissé passe par des positions intermédiaires, strictement entre
  // le départ et l'arrivée. On les relève à intervalle fixe dès le clic (les évènements de défilement sont
  // regroupés par WebKit quand la machine est chargée : les compter ne prouvait rien).
  const intermediaires = await page.evaluate(async () => {
    const releves: number[] = [];
    const depart = scrollY;
    const minuteur = setInterval(() => releves.push(scrollY), 16);
    [...document.querySelectorAll("a")].find((a) => a.textContent?.trim() === "Voir le catalogue")!.click();
    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(minuteur);
    const arrivee = scrollY;
    return new Set(releves.filter((y) => y > depart + 1 && y < arrivee - 1).map(Math.round)).size;
  });
  await expect(page).toHaveURL(/#collection$/);
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById("collection")!.getBoundingClientRect().top))).toBeLessThan(200);
  // Un saut n'en a aucune. (Machine chargée : WebKit peut ne peindre que 2 ou 3 images du glissé.)
  expect(intermediaires).toBeGreaterThan(0);
});
