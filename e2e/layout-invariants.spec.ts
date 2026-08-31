import { test, expect, type Page } from "@playwright/test";
import { installAdminSession } from "./helpers/adminSession";
import {
  collectBottomOcclusion,
  collectHydrationViolations,
  collectKeyboardViolations,
  collectLayoutViolations,
  simulateKeyboard,
  type Violation,
} from "./helpers/layoutInvariants";

/**
 * Invariants d'affichage de l'app de gestion.
 *
 * Ces tests ne décrivent pas un écran en particulier : ils énoncent ce qui ne
 * doit jamais arriver dans une app mobile — défilement latéral, texte coupé
 * net, contrôle sous la barre d'onglets ou sous le clavier — et l'éprouvent
 * sur toutes les routes, à trois largeurs, clavier ouvert comme fermé.
 *
 * C'est le filet qui remplace la relecture manuelle écran par écran.
 */

/** Les trois largeurs réelles du parc iPhone en circulation. */
const VIEWPORTS = [
  { name: "iPhone SE", width: 320, height: 568 },
  { name: "iPhone 13", width: 375, height: 812 },
  { name: "iPhone 15 Pro Max", width: 430, height: 932 },
] as const;

/** Routes statiques. Les routes à paramètre sont résolues à l'exécution. */
const STATIC_ROUTES = [
  "/admin",
  "/admin/ordres",
  "/admin/ordres/new",
  "/admin/vendre",
  "/admin/compta",
  "/admin/compta?vue=tresorerie",
  "/admin/catalogue",
  "/admin/catalogue?tab=brands",
  "/admin/catalogue?tab=featured",
  "/admin/clients",
  "/admin/clients/new",
  "/admin/lots",
  "/admin/lots/new",
  "/admin/perfumes/new",
  "/admin/brands/new",
  "/admin/stats/top-parfums",
  "/admin/offline",
] as const;

function format(route: string, viewport: string, items: Violation[]): string {
  return [
    `${items.length} violation(s) — ${route} @ ${viewport}`,
    ...items.map((v) => `  • [${v.rule}] ${v.selector}\n    ${v.detail}`),
  ].join("\n");
}

async function gotoAdmin(page: Page, route: string): Promise<boolean> {
  const res = await page.goto(route, { waitUntil: "networkidle" });
  if (res && res.status() >= 400) return false;
  if (page.url().includes("/admin/login")) return false;
  // Laisse les Suspense serveur se résoudre avant de mesurer.
  await page.waitForTimeout(600);
  return true;
}

/**
 * Amène la zone de défilement en bas : c'est là que la réserve basse se prouve.
 *
 * Répété jusqu'à stabilisation : un bloc rendu en différé (Suspense serveur,
 * image qui se charge) rallonge la page après un premier défilement, et la
 * mesure porterait alors sur un état intermédiaire.
 */
async function scrollToBottom(page: Page): Promise<void> {
  // Les listes paginées (clients) chargent une page de plus à chaque passage
  // en bas : il faut plusieurs tours avant que la hauteur se fige.
  let previous = -1;
  for (let i = 0; i < 12; i += 1) {
    const position = await page.evaluate(() => {
      const root = document.getElementById("admin-scroll-root");
      if (!root) return -1;
      root.scrollTop = root.scrollHeight;
      return root.scrollTop;
    });
    if (position === previous) return;
    previous = position;
    // Une liste paginée déclenche une requête en atteignant le bas : attendre
    // le silence réseau évite de mesurer avant l'arrivée des lignes suivantes.
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

test.describe("Invariants d'affichage — gestion", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Mesures de mise en page : un seul moteur suffit.");

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      for (const route of STATIC_ROUTES) {
        test(`${route} respecte les invariants`, async ({ page, context, baseURL }) => {
          const authed = await installAdminSession(context, baseURL ?? "http://localhost:3000");
          test.skip(!authed, "ADMIN_JWT_SECRET absent de l'environnement.");

          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          const reachable = await gotoAdmin(page, route);
          test.skip(!reachable, `Route ${route} injoignable (session ou données absentes).`);

          // Interactivité d'abord : un écran non hydraté est joli et mort.
          const dead = await collectHydrationViolations(page);

          // Géométrie et cibles : mesurées sur l'écran tel qu'il s'affiche.
          const { violations, warnings } = await collectLayoutViolations(page);

          // Réserve basse : ne se prouve qu'une fois le bas atteint, la barre
          // d'onglets recouvrant légitimement le contenu en cours de route.
          await scrollToBottom(page);
          const occluded = await collectBottomOcclusion(page);

          const seen = new Set<string>();
          const all = [...dead, ...violations, ...occluded].filter((v) => {
            const key = `${v.rule}|${v.selector}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          if (warnings.length > 0) {
            console.warn(format(`${route} (avertissements)`, viewport.name, warnings));
          }
          expect(all, format(route, viewport.name, all)).toEqual([]);
        });
      }
    });
  }
});

test.describe("Invariants clavier — gestion", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Mesures de mise en page : un seul moteur suffit.");

  /** Écrans de saisie : ce sont les seuls où le clavier s'ouvre. */
  const FORM_ROUTES = [
    "/admin/ordres/new",
    "/admin/vendre",
    "/admin/clients/new",
    "/admin/lots/new",
    "/admin/perfumes/new",
    "/admin/brands/new",
  ] as const;

  for (const route of FORM_ROUTES) {
    test(`${route} reste utilisable clavier ouvert`, async ({ page, context, baseURL }) => {
      const authed = await installAdminSession(context, baseURL ?? "http://localhost:3000");
      test.skip(!authed, "ADMIN_JWT_SECRET absent de l'environnement.");

      await page.setViewportSize({ width: 375, height: 812 });
      const reachable = await gotoAdmin(page, route);
      test.skip(!reachable, `Route ${route} injoignable.`);

      // Commande et Vente n'exposent aucun champ tant que le client n'est pas
      // en saisie libre : on déplie l'affordance avant de mesurer, sinon le
      // test se contenterait de sauter les deux écrans les plus utilisés.
      const reveal = page.getByRole("button", { name: /Client de passage/i });
      if (await reveal.count()) await reveal.first().click();

      const input = page
        .locator('input:not([type="hidden"]):not([type="search"]), textarea')
        .first();
      const hasInput = (await input.count()) > 0;
      test.skip(!hasInput, "Aucun champ de saisie sur cet écran.");

      await input.focus();
      await simulateKeyboard(page);

      const found = await collectKeyboardViolations(page);
      expect(found, format(`${route} (clavier)`, "iPhone 13", found)).toEqual([]);
    });
  }

  test("le sélecteur de client garde ses résultats visibles clavier ouvert", async ({
    page,
    context,
    baseURL,
  }) => {
    const authed = await installAdminSession(context, baseURL ?? "http://localhost:3000");
    test.skip(!authed, "ADMIN_JWT_SECRET absent de l'environnement.");

    await page.setViewportSize({ width: 375, height: 812 });
    const reachable = await gotoAdmin(page, "/admin/vendre");
    test.skip(!reachable, "Route /admin/vendre injoignable.");

    await page.locator('button[aria-haspopup="dialog"]').first().click();
    await expect(page.locator("[data-vaul-drawer]")).toBeVisible();

    const search = page.locator('[data-vaul-drawer] input[type="search"]');
    await search.fill("a");
    // La recherche est débouncée : attendre la liste plutôt qu'un délai fixe.
    await expect(page.locator('[data-vaul-drawer] [role="option"]').first()).toBeVisible();
    await simulateKeyboard(page);

    const found = await collectKeyboardViolations(page);
    expect(found, format("sélecteur client (clavier)", "iPhone 13", found)).toEqual([]);

    // Régression : la liste doit rester lisible, pas réduite à une lucarne.
    const rows = page.locator('[data-vaul-drawer] [role="option"]');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first()).toBeVisible();
  });
});

test.describe("Invariants d'affichage — écrans de détail", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Mesures de mise en page : un seul moteur suffit.");

  /**
   * Les fiches n'ont pas d'URL fixe : leurs identifiants sont lus dans l'app au
   * moment du test. Sans ça, les écrans les plus riches — ceux qui débordent le
   * plus — resteraient hors couverture.
   */
  const SECTIONS = [
    { label: "commande", list: "/admin/ordres", linkPattern: /^\/admin\/ordres\/[^/]+$/ },
    { label: "client", list: "/admin/clients", linkPattern: /^\/admin\/clients\/[^/]+$/ },
    { label: "lot", list: "/admin/lots", linkPattern: /^\/admin\/lots\/[^/]+$/ },
    { label: "parfum", list: "/admin/catalogue", linkPattern: /^\/admin\/perfumes\/[^/]+\/edit$/ },
  ] as const;

  for (const section of SECTIONS) {
    test(`fiche ${section.label} respecte les invariants`, async ({ page, context, baseURL }) => {
      const authed = await installAdminSession(context, baseURL ?? "http://localhost:3000");
      test.skip(!authed, "ADMIN_JWT_SECRET absent de l'environnement.");

      await page.setViewportSize({ width: 375, height: 812 });
      const listReachable = await gotoAdmin(page, section.list);
      test.skip(!listReachable, `Liste ${section.list} injoignable.`);

      const href = await page.evaluate((source) => {
        const re = new RegExp(source);
        const link = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).find((a) =>
          re.test(new URL(a.href, location.origin).pathname),
        );
        return link ? new URL(link.href, location.origin).pathname : null;
      }, section.linkPattern.source);
      test.skip(!href, `Aucune fiche ${section.label} en base pour ce test.`);

      const reachable = await gotoAdmin(page, href!);
      test.skip(!reachable, `Fiche ${href} injoignable.`);

      const { violations } = await collectLayoutViolations(page);
      await scrollToBottom(page);
      const occluded = await collectBottomOcclusion(page);

      const all = [...violations, ...occluded];
      expect(all, format(href!, "iPhone 13", all)).toEqual([]);
    });
  }
});
