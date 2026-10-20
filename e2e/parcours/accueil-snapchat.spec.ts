import { test, expect, type Page } from "@playwright/test";
import { countTaps } from "../helpers/tap";

/**
 * Accueil de la vitrine (04-PLAN-EXECUTION § T15, composition A) : depuis l'arrivée, message
 * Snapchat prêt en 4 taps au plus — attendu : 2, le visuel du premier parfum mis en avant, puis
 * « Commander sur Snapchat » dans la fiche. Vérifie aussi le H1 unique et l'absence de modale à
 * l'arrivée. Catalogue de démonstration (aucune base) : deux parfums y sont mis en avant.
 */

const sheet = (page: Page) => page.getByRole("dialog").filter({ has: page.locator("h2") });

async function home(page: Page, waitUntil: "networkidle" | "commit" = "networkidle") {
  /* Le presse-papiers est observé, pas lu : Chromium ne le donne qu'avec le focus de la fenêtre. */
  await page.addInitScript(() => {
    const copied: string[] = [];
    (window as unknown as { __copied: string[] }).__copied = copied;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => void copied.push(text) },
    });
  });
  await page.context().route(/snapchat\.com/, (route) => route.abort());
  await page.goto("/", { waitUntil });
}

test.describe("Accueil : Snapchat depuis l'arrivée", () => {
  test("un H1 qui porte la marque et la ville, aucune modale à l'arrivée", async ({ page }) => {
    await home(page);
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("Nuréa Parfums");
    await expect(h1).toContainText("Marseille");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("message prêt en deux taps : le visuel mis en avant, puis Snapchat", async ({ page }) => {
    await home(page);
    const taps = countTaps(page);
    const visual = page.getByRole("button", { name: /^Voir la fiche : / }).first();
    await expect(visual).toBeInViewport();
    const featured = (await page.locator("section[aria-labelledby^='une-'] h2").first().innerText()).trim();

    /* Un seul tap, même pendant l'hydratation : la demande attend que le catalogue soit prêt. */
    await taps.tap(visual, "visuel mis en avant");
    await expect(sheet(page)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/[?&]parfum=\d+/);
    await expect(sheet(page).locator("h2")).toHaveText(featured);

    const order = sheet(page).locator("a[href*=\"snapchat\"]").filter({ visible: true });
    const popup = page.waitForEvent("popup");
    await taps.tap(order, "Commander sur Snapchat");
    await (await popup).close();

    await expect(order).toHaveText(/Nom copié/);
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    expect(copied).toHaveLength(1);
    expect(copied[0]!.startsWith(`${featured} (`) && copied[0]!.endsWith(")")).toBe(true);
    taps.expectAtMost(4);
    expect(taps.count).toBe(2);
  });

  test("un tap avant que la page soit prête ouvre quand même la fiche", async ({ page }) => {
    await home(page, "commit");
    const visual = page.getByRole("button", { name: /^Voir la fiche : / }).first();
    /* Le bandeau est branché (React l'a hydraté) ; le catalogue, plus bas, peut ne pas l'être encore. */
    await expect
      .poll(() => visual.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps"))), { timeout: 20_000 })
      .toBe(true);
    await visual.click();
    await expect(sheet(page)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/\?(.*&)?parfum=\d+/);
  });

  test("le nom mis en avant ouvre la même fiche, sans quitter l'accueil", async ({ page }) => {
    await home(page);
    const name = page.locator("section[aria-labelledby^='une-'] h2 a").first();
    await expect(name).toHaveAttribute("href", /^\/parfums\/[^/]+\/[^/]+-\d+$/);
    await name.click();
    await expect(sheet(page)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/^[^?]*\/\?(.*&)?parfum=\d+/);
  });
});
