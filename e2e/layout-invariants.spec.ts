import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { waitForHydration } from "./helpers/hydration";
import {
  collectBottomOcclusion,
  collectHydrationViolations,
  collectKeyboardViolations,
  collectLayoutViolations,
  simulateKeyboard,
  type Violation,
} from "./helpers/layoutInvariants";
import { routes } from "../src/app-shell/routes";
import { SCREENS, SHEETS, uncoveredRoutes, type ScreenCase } from "./routes";

/**
 * Invariants d'affichage de la gestion (`npm run test:layout`, 05 §5.5, 06 §1.8).
 *
 * Ces tests ne décrivent pas un écran : ils énoncent ce qui ne doit jamais arriver dans une app
 * mobile — défilement latéral, texte coupé net, contrôle sous la barre d'onglets ou sous le clavier,
 * écran non hydraté, deux actions principales — et l'éprouvent sur chaque écran et chaque sheet
 * livrés (`e2e/routes.ts`), aux trois largeurs du parc iPhone, clavier ouvert comme fermé.
 *
 * Session réelle : celle ouverte PAR L'ÉCRAN dans `global-setup.ts`. Un écran injoignable ÉCHOUE —
 * il ne se déclare jamais « sauté », ce qui ressemblait à un succès.
 */

/** Les trois largeurs réelles du parc iPhone. */
const VIEWPORTS = [
  { name: "iPhone SE", width: 320, height: 568 },
  { name: "iPhone 13", width: 375, height: 812 },
  { name: "iPhone 15 Pro Max", width: 430, height: 932 },
] as const;

/** Hauteur du clavier iOS simulé (portrait, suggestions comprises). */
const KEYBOARD = 336;

function format(where: string, items: Violation[]): string {
  return [`${items.length} violation(s) — ${where}`, ...items.map((v) => `  • [${v.rule}] ${v.selector}\n    ${v.detail}`)].join("\n");
}

function unique(items: Violation[]): Violation[] {
  const seen = new Set<string>();
  return items.filter((v) => {
    const key = `${v.rule}|${v.selector}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function addCookies(context: BrowserContext, screen: ScreenCase, baseURL: string | undefined) {
  if (!screen.cookies?.length) return;
  const { hostname } = new URL(baseURL ?? "http://localhost");
  await context.addCookies(screen.cookies.map((c) => ({ ...c, domain: hostname })));
}

/** Ouvre l'écran et attend qu'il soit vivant (hydraté, blocs posés). */
async function open(page: Page, url: string, shell: boolean): Promise<void> {
  const response = await page.goto(url, { waitUntil: "load" });
  expect(response?.status() ?? 0, `${url} répond`).toBeLessThan(400);
  if (shell) {
    expect(new URL(page.url()).pathname, `${url} : session refusée`).not.toBe("/admin/login");
    await waitForHydration(page.locator("[data-tabbar] a").first());
  } else {
    await waitForHydration(page.getByRole("button", { name: "Se connecter" }));
  }
  // Laisse les Suspense serveur se résoudre avant de mesurer.
  await page.waitForTimeout(300);
}

/** Amène la zone de défilement en bas, jusqu'à stabilisation : la réserve basse se prouve là. */
async function scrollToBottom(page: Page): Promise<void> {
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
    await page.waitForTimeout(250);
  }
}

/**
 * Un libellé d'onglet se lit en entier : l'ellipse, que le contrôle « texte rogné » accepte, ne
 * suffit pas pour une destination permanente (« Comman… » à 320 px, relevé à J4).
 */
async function collectTabLabelTruncation(page: Page): Promise<Violation[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-tabbar] a > span:last-child"))
      .filter((label) => label.scrollWidth > label.clientWidth + 1)
      .map((label) => ({
        rule: "libelle-onglet-tronque",
        detail: `Libellé d'onglet tronqué (${label.scrollWidth}px dans ${label.clientWidth}px).`,
        selector: `onglet « ${(label.textContent ?? "").trim()} »`,
      })),
  );
}

async function screenViolations(page: Page): Promise<{ violations: Violation[]; warnings: Violation[] }> {
  const dead = await collectHydrationViolations(page);
  const { violations, warnings } = await collectLayoutViolations(page);
  const labels = await collectTabLabelTruncation(page);
  await scrollToBottom(page);
  const occluded = await collectBottomOcclusion(page);
  return { violations: unique([...dead, ...violations, ...labels, ...occluded]), warnings };
}

/** Le dernier champ d'un formulaire garde son bouton d'envoi au-dessus du clavier (06 §4.5). */
async function submitUnderKeyboard(page: Page, label: string): Promise<Violation[]> {
  return page.evaluate(
    ({ kb, name }) => {
      const button = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").trim() === name);
      if (!button) return [{ rule: "cta-absent", detail: `Bouton « ${name} » introuvable.`, selector: "form" }];
      const r = button.getBoundingClientRect();
      const keyboardTop = window.innerHeight - kb;
      return r.bottom > keyboardTop + 1 || r.top < 0
        ? [{ rule: "cta-hors-vue-clavier", detail: `« ${name} » hors de la zone visible (${Math.round(r.top)}→${Math.round(r.bottom)} px, clavier à ${keyboardTop} px).`, selector: `button « ${name} »` }]
        : [];
    },
    { kb: KEYBOARD, name: label },
  );
}

test.describe("Invariants d'affichage — gestion", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Mesures de mise en page : un seul moteur suffit.");

  test("e2e/routes.ts couvre chaque écran livré de src/app-shell/routes.ts", () => {
    expect(uncoveredRoutes()).toEqual([]);
  });

  test("auto-contrôle : les invariants ajoutés à J4 détectent ce qu'ils interdisent", async ({ page }) => {
    await page.setContent(`
      <div class="admin-app-container" style="width:320px">
        <button data-variant="primary">Encaisser</button>
        <button data-variant="primary">Livrer</button>
        <div role="dialog"><button data-variant="primary">Enregistrer</button></div>
        <div style="position:relative;height:56px"><button id="rangee" style="height:20px">Nouvelle vente</button></div>
        <button style="height:20px">Petit</button>
        <style>#rangee::after{content:"";position:absolute;inset:0}</style>
        <span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Recherche au lecteur d'écran</span>
        <nav data-tabbar><a href="#"><span></span><span style="display:block;width:30px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Commandes</span></a></nav>
      </div>`);
    const { violations } = await collectLayoutViolations(page);
    const about = (rule: string, text: string) => violations.filter((v) => v.rule === rule && v.selector.includes(text));
    // Deux primary sur l'écran : une violation ; celui du dialogue est dans sa propre couche.
    expect(violations.filter((v) => v.rule === "plusieurs-primary").map((v) => v.selector)).toEqual(["écran"]);
    // Rangée étendue par pseudo-élément : la cible est la rangée (56 px), pas le texte (20 px).
    expect(about("cible-tactile", "Nouvelle vente")).toEqual([]);
    expect(about("cible-tactile", "Petit")).toHaveLength(1);
    // Texte `sr-only` : jamais « rogné ».
    expect(violations.filter((v) => v.rule === "texte-rogne")).toEqual([]);
    expect((await collectTabLabelTruncation(page)).map((v) => v.selector)).toEqual(["onglet « Commandes »"]);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width} px)`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });

      for (const screen of SCREENS) {
        test.describe(`${screen.screen} — ${screen.label}`, () => {
          if (!screen.shell) test.use({ storageState: { cookies: [], origins: [] } });

          test(`${screen.url} respecte les invariants`, async ({ page, context, baseURL }) => {
            await addCookies(context, screen, baseURL);
            await open(page, screen.url, screen.shell);
            const { violations, warnings } = await screenViolations(page);
            if (warnings.length > 0) console.warn(format(`${screen.url} @ ${viewport.width} px (avertissements)`, warnings));
            expect(violations, format(`${screen.url} @ ${viewport.width} px`, violations)).toEqual([]);
          });

          const fields = screen.keyboardFields ?? [];
          fields.forEach((field, index) => {
            test(`clavier ouvert sur « ${field} »`, async ({ page, context, baseURL }) => {
              await addCookies(context, screen, baseURL);
              await open(page, screen.url, screen.shell);
              await simulateKeyboard(page, KEYBOARD);
              await page.getByLabel(field, { exact: true }).focus();
              // Le cadrage suit la montée du clavier (~320 ms) puis un défilement doux.
              await page.waitForTimeout(900);
              const found = await collectKeyboardViolations(page, KEYBOARD);
              if (!screen.shell && index === fields.length - 1) found.push(...(await submitUnderKeyboard(page, "Se connecter")));
              expect(found, format(`${screen.url} @ ${viewport.width} px, clavier sur « ${field} »`, found)).toEqual([]);
            });
          });
        });
      }

      for (const sheet of SHEETS) {
        test(`${sheet.sheet} — ${sheet.label}, clavier ouvert`, async ({ page }) => {
          await open(page, sheet.url, true);
          await page.locator("[data-search-trigger]").tap();
          const dialog = page.locator("[data-command-palette]");
          await expect(dialog).toBeVisible();
          // Le champ du dialogue, et non le bouton « Rechercher » du header qui porte le même nom.
          await expect(dialog.getByLabel("Rechercher", { exact: true })).toBeFocused();

          const { violations } = await collectLayoutViolations(page);
          expect(violations, format(`${sheet.sheet} sur ${sheet.url} @ ${viewport.width} px`, violations)).toEqual([]);

          await simulateKeyboard(page, KEYBOARD);
          for (const field of sheet.keyboardFields ?? []) {
            await dialog.getByLabel(field, { exact: true }).focus();
            const found = await collectKeyboardViolations(page, KEYBOARD);
            expect(found, format(`${sheet.sheet} @ ${viewport.width} px, clavier sur « ${field} »`, found)).toEqual([]);
          }
        });
      }

      test("tab bar avec le point de brouillon de Vendre", async ({ page }) => {
        await page.addInitScript(() => {
          localStorage.setItem("nurea:brouillon:vendre", JSON.stringify({ v: 1, savedAt: Date.now(), value: { lignes: 1 } }));
        });
        await open(page, routes.accueil(), true);
        await expect(page.getByRole("link", { name: "Vendre, brouillon en cours" })).toBeVisible();
        const { violations } = await screenViolations(page);
        expect(violations, format(`point de brouillon @ ${viewport.width} px`, violations)).toEqual([]);
      });
    });
  }

  test.describe("pointeur fin (⌘K affiché)", () => {
    for (const width of [320, 430]) {
      test(`header de l'Accueil à ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await open(page, routes.accueil(), true);
        await expect(page.locator("[data-search-trigger] kbd")).toBeVisible();
        const { violations } = await screenViolations(page);
        expect(violations, format(`/admin @ ${width} px, pointeur fin`, violations)).toEqual([]);
      });
    }
  });
});
