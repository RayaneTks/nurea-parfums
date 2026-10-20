import { test, expect, type Page } from "@playwright/test";
import { countTaps } from "./helpers/tap";

/**
 * Fiche en feuille (04-PLAN-EXECUTION § T12) : message prêt en deux taps depuis la grille, fermeture
 * au glissé rapide, au bouton et à Échap, focus rendu à la carte, précédent/suivant au glissé, fiche
 * tenue par l'adresse (`?parfum=<id>`), apparition en fondu quand le mouvement est réduit.
 */

const cards = (page: Page) => page.getByRole("button", { name: /voir comment commander$/ });
const sheet = (page: Page) => page.getByRole("dialog").filter({ has: page.locator("h2") });

async function home(page: Page) {
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
  await page.goto("/", { waitUntil: "networkidle" });
}

/** Ouvre la première carte ; rendu serveur : on attend l'interactivité, pas la seule visibilité. */
async function openFirst(page: Page) {
  await expect(async () => {
    await cards(page).first().click();
    await expect(sheet(page)).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

/** Glissé au doigt réel (Chromium, événements tactiles), `steps` points sur `ms` millisecondes. */
async function swipe(page: Page, from: { x: number; y: number }, by: { x: number; y: number }, steps = 6) {
  const cdp = await page.context().newCDPSession(page);
  const point = (i: number) => ({ x: from.x + (by.x * i) / steps, y: from.y + (by.y * i) / steps });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(0)] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(i)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

test.describe("Fiche en feuille", () => {
  test("message prêt en deux taps : la carte, puis Snapchat", async ({ page }) => {
    await home(page);
    const taps = countTaps(page);
    const card = cards(page).first();
    await expect(card).toBeVisible();

    await expect(async () => {
      await taps.tap(card, "carte");
      await expect(sheet(page)).toBeVisible({ timeout: 1_000 });
    }).toPass();
    const name = (await sheet(page).locator("h2").innerText()).trim();

    /* Par son adresse : son nom change le temps du succès (« Nom copié »). */
    const order = sheet(page).locator("a[href*=\"snapchat\"]").filter({ visible: true });
    const popup = page.waitForEvent("popup");
    await taps.tap(order, "Commander sur Snapchat");
    await (await popup).close();

    await expect(order).toHaveText(/Nom copié/);
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatch(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(.+\\)$`));
    /* Débouté de « Taps » si le parcours en ajoute un troisième (02 § 2). */
    taps.expectAtMost(2);
    await expect(order).toHaveText(/Commander sur Snapchat/, { timeout: 3_000 }); // retour au repos après 1 600 ms
  });

  test("Échap ferme, le focus revient à la carte, l'adresse suit", async ({ page }) => {
    await home(page);
    await openFirst(page);
    await expect(page).toHaveURL(/[?&]parfum=\d+/);
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toBeHidden();
    await expect(cards(page).first()).toBeFocused();
    await expect(page).not.toHaveURL(/parfum=/);
  });

  test("le bouton Fermer ferme", async ({ page }) => {
    await home(page);
    await openFirst(page);
    await sheet(page).getByRole("button", { name: "Fermer" }).click();
    await expect(sheet(page)).toBeHidden();
  });

  test("un lien ?parfum=<id> rouvre la même fiche", async ({ page }) => {
    await home(page);
    await openFirst(page);
    const name = await sheet(page).locator("h2").innerText();
    await expect(page).toHaveURL(/[?&]parfum=\d+/);
    await page.reload({ waitUntil: "networkidle" });
    await expect(sheet(page).locator("h2")).toHaveText(name);
  });

  test("mouvement réduit : la feuille apparaît en fondu, sans glisser", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await home(page);
    await page.evaluate(() => {
      const shifts: number[] = [];
      (window as unknown as { __shifts: number[] }).__shifts = shifts;
      const sample = () => {
        const panel = document.querySelector<HTMLElement>("[data-perfume-sheet]");
        if (panel) shifts.push(new DOMMatrix(getComputedStyle(panel).transform).m42);
        if (shifts.length < 30) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await openFirst(page);
    await page.waitForFunction(() => (window as unknown as { __shifts: number[] }).__shifts.length >= 30);
    const shifts = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts);
    expect(Math.max(...shifts.map(Math.abs))).toBe(0);
  });
});

test.describe("Fiche en feuille — gestes (téléphone)", () => {
  test.skip(({ isMobile }) => !isMobile, "gestes tactiles");

  test("un glissé rapide vers le bas ferme", async ({ page }) => {
    await home(page);
    await openFirst(page);
    await page.waitForTimeout(600); // entrée terminée
    const handle = sheet(page).locator("[data-sheet-handle]").first();
    const box = (await handle.boundingBox())!;
    await swipe(page, { x: box.x + box.width / 2, y: box.y + 10 }, { x: 0, y: 90 });
    await expect(sheet(page)).toBeHidden();
  });

  test("un glissé vers la gauche passe au parfum suivant, vers la droite revient", async ({ page }) => {
    await home(page);
    await openFirst(page);
    await page.waitForTimeout(600);
    const title = sheet(page).locator("h2");
    const first = await title.innerText();
    const url = page.url();
    const box = (await sheet(page).boundingBox())!;
    const mid = { x: box.x + box.width * 0.8, y: box.y + box.height * 0.6 };

    await swipe(page, mid, { x: -box.width * 0.5, y: 6 });
    await expect(title).not.toHaveText(first);
    await expect(sheet(page)).toBeVisible();
    await expect.poll(() => page.url()).not.toBe(url);

    await swipe(page, { x: box.x + box.width * 0.2, y: mid.y }, { x: box.width * 0.5, y: 6 });
    await expect(title).toHaveText(first);
  });
});
