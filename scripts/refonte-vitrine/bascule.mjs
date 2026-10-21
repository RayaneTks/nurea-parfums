// Position d'un visuel avant / après bascule de thème, sans animation (classe posée directement),
// dans les mêmes conditions. Usage : node bascule.mjs <url> <nom du parfum> [largeur]
import { chromium } from "@playwright/test";
const [url, nom, largeur = "390"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(largeur), height: 844 }, colorScheme: "dark" });
await page.goto(url, { waitUntil: "networkidle" });
const img = page.locator(`img[alt^="${nom} de"]`).first();
await img.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const mesure = () => img.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +(b.y + scrollY).toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), src: el.currentSrc.split("/").pop() }; });
const theme = (t) => page.evaluate((t) => { const r = document.documentElement; r.classList.remove("light", "dark"); r.classList.add(t); }, t);
const avant = await mesure();
await theme("light"); await page.waitForTimeout(300);
const apres = await mesure();
await theme("dark"); await page.waitForTimeout(300);
const retour = await mesure();
console.log(JSON.stringify({ largeur, sombre: avant, clair: apres, sombre_retour: retour, dy: +(apres.y - avant.y).toFixed(2), dx: +(apres.x - avant.x).toFixed(2), dh: +(apres.h - avant.h).toFixed(2) }));
await browser.close();
