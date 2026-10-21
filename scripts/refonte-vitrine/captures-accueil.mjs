// Captures d'une section de l'accueil (téléphone clair et sombre, bureau clair et sombre), sur un build de
// production. Usage : node captures-accueil.mjs [url] [dossier] [sélecteur du titre de section]
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";
const [url = "http://localhost:3004/", out = ".tmp/refonte-vitrine/captures", titre = "#affiche-titre"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const jobs = [
  { name: "mobile-clair", ctx: { ...devices["iPhone 13"], colorScheme: "light" } },
  { name: "mobile-sombre", ctx: { ...devices["iPhone 13"], colorScheme: "dark" } },
  { name: "bureau-sombre", ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" } },
  { name: "bureau-clair", ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light" } },
];
const browser = await chromium.launch();
for (const job of jobs) {
  const ctx = await browser.newContext(job.ctx);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate((titre) => {
    const top = document.querySelector(titre).getBoundingClientRect().top + scrollY;
    const bar = document.querySelector("header").getBoundingClientRect().height;
    window.scrollTo(0, top - bar - 16);
  }, titre);
  // Capture seulement : la barre collante recouvrirait le haut de la section cadrée.
  await page.addStyleTag({ content: "header { visibility: hidden !important; }" });
  await page.waitForTimeout(1200);
  await page.locator(`section[aria-labelledby=${titre.slice(1)}]`).screenshot({ path: `${out}/${job.name}.png` });
  console.log(job.name, await page.evaluate(() => [document.documentElement.className, document.documentElement.scrollWidth, innerWidth].join(" ")));
  await ctx.close();
}
await browser.close();
