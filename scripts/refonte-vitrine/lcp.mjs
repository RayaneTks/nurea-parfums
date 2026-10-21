// LCP au profil de T9 : 4G lente (RTT 150 ms, 1,6 Mbit/s), CPU ×4, Pixel 7, 3 passages à froid.
import { chromium, devices } from "@playwright/test";
const url = process.argv[2] ?? "http://localhost:3004/";
const colorScheme = process.argv[3] ?? "dark";
const browser = await chromium.launch();
const out = [];
for (let i = 0; i < 3; i++) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, colorScheme });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    window.__lcp = null; window.__cls = 0;
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); window.__lcp = { t: e.startTime, el: e.element ? e.element.tagName + " " + (e.element.closest("section")?.getAttribute("aria-labelledby") ?? "") + " " + (e.url || "").split("/").pop() : e.url }; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(3000);
  out.push(await page.evaluate(() => ({ lcp: Math.round(window.__lcp?.t), el: window.__lcp?.el, cls: +window.__cls.toFixed(3) })));
  await ctx.close();
}
await browser.close();
const sorted = out.map((o) => o.lcp).sort((a, b) => a - b);
console.log(JSON.stringify(out, null, 1), "\nmédiane", sorted[1]);
