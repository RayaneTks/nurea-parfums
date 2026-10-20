// Photo d'une vitrine, pages × écrans × thèmes. Lecture seule, aucune écriture sur le site.
//   node scripts/refonte-vitrine/capture.mjs <urlDeBase> <dossierDeSortie> [--themes=dark,light]
// Sortie par défaut : .tmp/refonte-vitrine/avant (hors dépôt, ~140 Mo).
import { chromium, webkit, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [base = "https://nureaparfums.fr", out = ".tmp/refonte-vitrine/avant"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const themes = (process.argv.find((a) => a.startsWith("--themes=")) ?? "--themes=dark,light").split("=")[1].split(",");
fs.mkdirSync(out, { recursive: true });

const MAX_CSS_HEIGHT = 6000;

const SCREENS = [
  { id: "mobile", engine: webkit, context: { ...devices["iPhone 13"] } },
  { id: "tablette", engine: chromium, context: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1.5 } },
  { id: "bureau", engine: chromium, context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
];

async function firstPerfumePath() {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  return locs.find((p) => /^\/parfums\/[^/]+\/[^/]+-\d+$/.test(p)) ?? "/parfums";
}

const perfumePath = await firstPerfumePath();
const PAGES = [
  ["accueil", "/"],
  ["recherche-parfum-absent", "/?q=khamrah"],
  ["recherche-vide", "/?q=zzqxw"],
  ["index-marques", "/parfums"],
  ["marque", "/parfums/dior"],
  ["fiche-parfum", perfumePath],
  ["la-parfumerie", "/marque"],
  ["contact", "/contact"],
  ["legal", "/legal"],
  ["erreur-404", "/cette-page-nexiste-pas"],
];

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(height, MAX_CSS_HEIGHT); y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(600);
}

async function shot(page, file) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = page.viewportSize().width;
  await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(height, MAX_CSS_HEIGHT) } });
}

const report = [];
for (const screen of SCREENS) {
  const browser = await screen.engine.launch();
  for (const theme of themes) {
    const context = await browser.newContext({ ...screen.context, locale: "fr-FR", colorScheme: theme });
    await context.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    for (const [id, route] of PAGES) {
      const page = await context.newPage();
      const file = path.join(out, `${id}__${screen.id}__${theme}.png`);
      try {
        const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 45000 });
        await settle(page);
        await shot(page, file);
        const perf = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          const lcp = performance.getEntriesByType("largest-contentful-paint").at(-1);
          return { dcl: Math.round(nav?.domContentLoadedEventEnd ?? 0), lcp: Math.round(lcp?.startTime ?? 0), imgs: document.images.length, nodes: document.getElementsByTagName("*").length };
        });
        report.push({ page: id, screen: screen.id, theme, status: response?.status(), ...perf });
        console.log("ok", id, screen.id, theme);
      } catch (e) {
        report.push({ page: id, screen: screen.id, theme, error: String(e).slice(0, 120) });
        console.log("ÉCHEC", id, screen.id, theme, String(e).slice(0, 80));
      }
      await page.close();
    }
    // Gestes de l'accueil (mobile seulement) : fiche ouverte, tiroir de filtres.
    if (screen.id === "mobile") {
      const page = await context.newPage();
      try {
        await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
        await settle(page);
        await page.locator("#collection button[aria-label]").first().click({ timeout: 8000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(out, `geste-fiche-ouverte__mobile__${theme}.png`) });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(800);
        await page.getByRole("button", { name: /Filtrer/ }).first().click({ timeout: 8000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(out, `geste-filtres-ouverts__mobile__${theme}.png`) });
      } catch (e) {
        console.log("ÉCHEC gestes", theme, String(e).slice(0, 80));
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(out, "mesures.json"), JSON.stringify({ base, date: new Date().toISOString(), report }, null, 1));
console.log("terminé :", report.length, "captures");
