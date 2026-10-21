import { test as base, expect } from "@playwright/test";

/**
 * Le `test` des parcours de la vitrine. La CSP de la vitrine porte `upgrade-insecure-requests`
 * (`next.config.mjs`) : en production, tout est en https. Chromium exempte `localhost` de cette
 * montée ; WebKit, non — il demande chaque script et chaque feuille en https au serveur local, qui
 * ne parle que http, et la page ne s'hydrate jamais. Sous WebKit seulement, la directive est retirée
 * de la réponse des PAGES servies en local ; tout le reste de la CSP est éprouvé tel quel.
 */
export const test = base.extend<{ httpLocal: void }>({
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
});

export { expect };
