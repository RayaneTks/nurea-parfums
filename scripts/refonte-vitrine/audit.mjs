// Audit T19 de la vitrine sur un build local (`next start -p 3004`) : axe (WCAG 2.2 A/AA) sur chaque
// page et état ouvert, dans les deux thèmes ; reflow au zoom 200 % (390 px → 195 px CSS) ; CLS.
// node scripts/refonte-vitrine/audit.mjs [http://localhost:3004]
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium, devices } from "@playwright/test";

const base = (process.argv[2] ?? "http://localhost:3004").replace(/\/$/, "");
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Une marque et une fiche réelles, lues dans le sitemap.
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const marque = locs.find((p) => /^\/parfums\/[^/]+$/.test(p));
const fiche = locs.find((p) => /^\/parfums\/[^/]+\/[^/]+$/.test(p));
const pages = ["/", "/parfums", marque, fiche, "/marque", "/contact", "/legal", "/page-inexistante"];

// États ouverts de l'accueil : une action, puis l'audit porte sur la page entière.
const etats = {
  "/ + fiche": async (p) => { await p.locator("[data-perfume-card] button, article button").first().click(); await p.waitForTimeout(800); },
  "/ + recherche": async (p) => { const f = p.getByRole("combobox").first(); await f.click(); await f.fill("dior"); await p.waitForTimeout(1500); },
  "/ + menu": async (p) => { await p.getByRole("button", { name: /menu/i }).first().click(); await p.waitForTimeout(800); },
};

const browser = await chromium.launch();
const rapport = { axe: [], reflow: [], cls: [] };

async function axe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (t) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: t }, resultTypes: ["violations", "incomplete"] });
    const map = (v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, cibles: v.nodes.slice(0, 3).map((n) => n.target.join(" ")), resume: v.nodes[0]?.failureSummary?.split("\n").slice(0, 2).join(" ") });
    return { violations: r.violations.map(map), incomplete: r.incomplete.filter((v) => v.id === "color-contrast").map(map) };
  }, tags);
}

for (const scheme of ["dark", "light"]) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, colorScheme: scheme });
  const page = await ctx.newPage();
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    rapport.axe.push({ scheme, path, ...(await axe(page)) });
    rapport.cls.push({ scheme, path, cls: await page.evaluate(() => new Promise((ok) => { let s = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) s += e.value; }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => ok(+s.toFixed(3)), 300); })) });
  }
  for (const [nom, agir] of Object.entries(etats)) {
    await page.goto(base + "/", { waitUntil: "networkidle" });
    try { await agir(page); rapport.axe.push({ scheme, path: nom, ...(await axe(page)) }); }
    catch (e) { rapport.axe.push({ scheme, path: nom, erreur: String(e).slice(0, 200) }); }
  }
  await ctx.close();
}

// Zoom 200 % sur un téléphone de 390 px = une fenêtre de 195 px CSS (WCAG 1.4.10 : rien ne déborde à l'horizontale).
const ctx = await browser.newContext({ viewport: { width: 195, height: 422 }, deviceScaleFactor: 4, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
for (const path of pages) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  rapport.reflow.push({ path, ...(await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const sorties = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > W + 1 && !el.closest("[data-scroll-x], [role=dialog]")) {
        let x = el.parentElement, rogne = false;
        while (x) { const o = getComputedStyle(x).overflowX; if (o !== "visible") { rogne = true; break; } x = x.parentElement; }
        if (!rogne) sorties.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} → ${Math.round(r.right)}`);
      }
    }
    return { scrollW: document.documentElement.scrollWidth, W, sorties: sorties.slice(0, 6) };
  })) });
}
// Contraste du texte posé sur la photo de la hero (axe le laisse « à vérifier ») : on efface le texte,
// on photographie le fond sous chaque ligne, et on retient le pixel de fond le moins contrasté.
rapport.photo = [];
for (const scheme of ["dark", "light"]) {
  for (const width of [320, 390, 430, 1280]) {
    const c = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme, reducedMotion: "reduce" });
    const p = await c.newPage();
    await p.goto(base + "/", { waitUntil: "networkidle" });
    const cibles = await p.evaluate(() => [...document.querySelectorAll(".hero-titre, .hero-titre .text-accent, .hero-entrees a:not(.bg-accent)")].map((el) => {
      const r = el.getBoundingClientRect();
      return { nom: el.matches(".text-accent") ? "Nuréa" : el.tagName === "H1" ? "titre" : "Snapchat", couleur: getComputedStyle(el).color, x: r.x, y: r.y + scrollY, w: r.width, h: r.height };
    }));
    await p.addStyleTag({ content: ".hero-titre, .hero-titre *, .hero-entrees, .hero-entrees * { color: transparent !important; visibility: hidden !important; }" });
    for (const t of cibles) {
      const png = await p.screenshot({ clip: { x: t.x, y: t.y, width: Math.max(1, t.w), height: Math.max(1, t.h) } });
      const pire = await p.evaluate(async ({ b64, couleur }) => {
        const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
        const cv = new OffscreenCanvas(img.width, img.height), cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, img.width, img.height).data;
        const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const probe = document.createElement("canvas").getContext("2d"); probe.fillStyle = couleur; probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data; const Lt = L(r, g, b);
        const ratios = [];
        for (let i = 0; i < d.length; i += 4) { const Lb = L(d[i], d[i + 1], d[i + 2]); ratios.push((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05)); }
        ratios.sort((a, b) => a - b);
        return { min: +ratios[0].toFixed(2), p5: +ratios[Math.floor(ratios.length * 0.05)].toFixed(2) };
      }, { b64: png.toString("base64"), couleur: t.couleur });
      rapport.photo.push({ scheme, width, nom: t.nom, ...pire });
    }
    await c.close();
  }
}
await browser.close();

for (const r of rapport.axe) {
  const v = r.violations ?? [];
  console.log(`${r.scheme} ${r.path} : ${r.erreur ?? `${v.length} violation(s)`}`);
  for (const x of v) console.log(`   - ${x.id} (${x.impact}) ×${x.n} ${x.cibles.join(" | ")} :: ${x.resume}`);
  for (const x of r.incomplete ?? []) console.log(`   ? contraste à vérifier ×${x.n} ${x.cibles.join(" | ")}`);
}
console.log("\nReflow 195 px :");
for (const r of rapport.reflow) console.log(`   ${r.path} : largeur ${r.scrollW}/${r.W}${r.sorties.length ? " — " + r.sorties.join(", ") : ""}`);
console.log("\nContraste sur la photo de la hero (pire pixel / 5e centile ; titre ≥ 3, lien ≥ 4,5) :");
for (const r of rapport.photo) console.log(`   ${r.scheme} ${r.width} ${r.nom} : ${r.min} / ${r.p5}`);
console.log("\nCLS au chargement :", rapport.cls.map((c) => `${c.scheme} ${c.path} ${c.cls}`).join(" · "));
