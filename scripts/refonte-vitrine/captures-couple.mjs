// Captures du couple de couleurs Nuréa (sombre : nuit + doré ; clair : ivoire + bordeaux) sur les
// surfaces qui portent la marque : haut de l'accueil, filtres actifs, fiche ouverte.
// Usage : node captures-couple.mjs [url] [dossier]
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";
const [url = "http://localhost:3004/", out = ".tmp/refonte-vitrine/couple"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const scheme of ["dark", "light"]) {
  const nom = scheme === "dark" ? "sombre" : "clair";
  const ctx = await browser.newContext({ ...devices["iPhone 13"], colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${out}/1-accueil-${nom}.png` });
  await page.locator("#catalogue-titre").scrollIntoViewIfNeeded();
  const chip = page.locator("#collection button[aria-pressed]").nth(1);
  if (await chip.count()) await chip.click();
  await page.waitForTimeout(400);
  await page.locator("#catalogue-titre").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/2-filtres-${nom}.png` });
  await page.getByRole("button", { name: /^Voir la fiche :/ }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/3-fiche-${nom}.png` });
  await ctx.close();
}
await browser.close();
