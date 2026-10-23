import { readFileSync } from "node:fs";
import { test as base, expect } from "@playwright/test";

/**
 * Le `test` des parcours de la vitrine. La CSP de la vitrine porte `upgrade-insecure-requests`
 * (`next.config.mjs`) : en production, tout est en https. Chromium exempte `localhost` de cette
 * montée ; WebKit, non — il demande chaque script et chaque feuille en https au serveur local, qui
 * ne parle que http, et la page ne s'hydrate jamais. Sous WebKit seulement, la directive est retirée
 * de la réponse des PAGES servies en local ; tout le reste de la CSP est éprouvé tel quel.
 */
export const test = base.extend<{ httpLocal: void; visuelsLocaux: void }>({
  httpLocal: [
    async ({ context, browserName }, use) => {
      if (browserName === "webkit") {
        await context.route(
          (url) => url.hostname === "localhost",
          async (route) => {
            if (route.request().resourceType() !== "document") return route.fallback();
            const response = await route.fetch();
            const headers = response.headers();
            const csp = headers["content-security-policy"];
            if (csp) {
              headers["content-security-policy"] = csp
                .split(";")
                .filter((directive) => directive.trim() !== "upgrade-insecure-requests")
                .join(";");
            }
            await route.fulfill({ response, headers });
          },
        );
      }
      await use();
    },
    { auto: true },
  ],
  /*
   * Les visuels du catalogue ne sont jamais téléchargés depuis le stockage en ligne pendant les tests :
   * une image locale les remplace. Chaque passage des tests consommait sinon le quota de transfert de
   * Supabase — c'est ce qui l'a épuisé le 23/10/2026 (photos coupées sur tout le site). Un test peut
   * redéfinir la route (par exemple pour simuler une panne).
   */
  visuelsLocaux: [
    async ({ context }, use) => {
      const image = readFileSync("public/branding/hero/flacon-portrait-sombre-640.webp");
      await context.route(/\.supabase\.co\/storage\//, (route) =>
        route.fulfill({ status: 200, contentType: "image/webp", body: image }),
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
