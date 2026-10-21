// INP de l'accueil sur un build local, au profil de T9 (Pixel 7, CPU ×4) : durée de chaque geste
// courant, de l'appui à l'image suivante (Event Timing). Budget : 200 ms.
// node scripts/refonte-vitrine/inp.mjs [http://localhost:3004]
import { chromium, devices } from "@playwright/test";

const base = (process.argv[2] ?? "http://localhost:3004").replace(/\/$/, "");
const browser = await chromium.launch();
const gestes = {
  "ouvrir une fiche": async (p) => p.locator("#collection article button, #collection [data-perfume-card] button").first().tap(),
  "fermer la fiche": async (p) => p.keyboard.press("Escape"),
  "filtre Femme": async (p) => p.getByRole("tab").nth(1).tap(),
  "changer le tri": async (p) => p.locator("#catalogue-tri").selectOption({ index: 1 }),
  "taille des visuels": async (p) => p.getByRole("group", { name: "Taille des visuels" }).getByRole("button").last().tap(),
  "bascule de thème": async (p) => p.getByRole("button", { name: /thème|mode/i }).first().tap(),
  "ouvrir le menu": async (p) => p.getByRole("button", { name: /menu/i }).first().tap(),
  "fermer le menu": async (p) => p.keyboard.press("Escape"),
  "taper une recherche": async (p) => { const f = p.getByRole("combobox").first(); await f.tap(); await f.pressSequentially("dio", { delay: 120 }); },
};

const out = {};
for (const scheme of ["dark", "light"]) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, colorScheme: scheme });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(() => {
    window.__ev = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__ev.push(e.duration); }).observe({ type: "event", durationThreshold: 16, buffered: true });
  });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (const [nom, geste] of Object.entries(gestes)) {
    await page.evaluate(() => { window.__ev = []; });
    try { await geste(page); await page.waitForTimeout(900); out[`${scheme} · ${nom}`] = await page.evaluate(() => Math.round(Math.max(0, ...window.__ev))); }
    catch (e) { out[`${scheme} · ${nom}`] = "échec : " + String(e).split("\n")[0].slice(0, 90); }
  }
  await ctx.close();
}
await browser.close();
for (const [k, v] of Object.entries(out)) console.log(`${k} : ${v}${typeof v === "number" ? " ms" : ""}`);
const n = Object.values(out).filter((v) => typeof v === "number");
console.log("pire :", Math.max(...n), "ms");
