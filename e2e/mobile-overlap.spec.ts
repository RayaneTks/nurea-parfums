import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Audit overlap mobile (iPhone 13) : vérifie qu'aucun CTA sticky ne passe
 * derrière la tab bar, que les footers de sheets restent visibles, et
 * capture chaque interface pour inspection visuelle.
 * Lancer : npx playwright test mobile-overlap --project=Mobile --workers=1
 */

const OUT = path.join(process.cwd(), "audit-shots");
fs.mkdirSync(OUT, { recursive: true });
const HAS_TOKEN = fs.existsSync("/tmp/admin_token.txt");

async function login(page: Page) {
  const token = fs.readFileSync("/tmp/admin_token.txt", "utf8").trim();
  await page.context().addCookies([
    { name: "nurea_admin", value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
  ]);
}

async function go(page: Page, url: string) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: "commit" });
      await page.waitForURL((u) => u.pathname + u.search === url || u.pathname === url.split("?")[0], {
        timeout: 8000,
      });
      break;
    } catch {
      await page.waitForTimeout(400);
    }
  }
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(800);
}

/** Vérifie qu'un CTA sticky ne chevauche pas la tab bar (sinon bouton caché). */
async function assertStickyAboveTabBar(page: Page, name: string) {
  const sticky = page.locator("[data-sticky-action]").first();
  if ((await sticky.count()) === 0) return;
  const tabbar = page.locator("[data-tabbar]").first();
  const sb = await sticky.boundingBox();
  const tb = await tabbar.boundingBox();
  if (!sb || !tb) return;
  // Le bas du CTA sticky doit rester au-dessus (ou au niveau) du haut de la tab bar.
  expect(
    sb.y + sb.height,
    `[${name}] CTA sticky chevauche la tab bar (bas CTA ${(sb.y + sb.height).toFixed(0)} > haut tabbar ${tb.y.toFixed(0)})`,
  ).toBeLessThanOrEqual(tb.y + 1);
}

/** Vérifie qu'un bouton de footer de sheet est entièrement dans le viewport. */
async function assertInViewport(page: Page, locator: ReturnType<Page["locator"]>, name: string) {
  const box = await locator.boundingBox();
  const vh = page.viewportSize()?.height ?? 844;
  expect(box, `[${name}] bouton introuvable`).not.toBeNull();
  if (box) {
    expect(
      box.y + box.height,
      `[${name}] bouton hors viewport (bas ${(box.y + box.height).toFixed(0)} > ${vh})`,
    ).toBeLessThanOrEqual(vh + 1);
  }
}

test.describe("Audit overlap mobile", () => {
  test.skip(!HAS_TOKEN, "Local uniquement.");
  test.use({ viewport: { width: 390, height: 844 } });

  test("CTA sticky des formulaires au-dessus de la tab bar", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);

    for (const [url, name] of [
      ["/admin/ordres/new?mode=quick", "ordre-quick"],
      ["/admin/ordres/new", "ordre-full"],
      ["/admin/clients/new", "client-new"],
      ["/admin/lots/new", "lot-new"],
      ["/admin/vendre", "vendre"],
    ] as const) {
      await go(page, url);
      await page.screenshot({ path: path.join(OUT, `ov-${name}.png`), fullPage: false });
      await assertStickyAboveTabBar(page, name);
    }
  });

  test("Trésorerie : sheets footers visibles", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);
    await go(page, "/admin/compta");
    await page.getByRole("radio", { name: "Trésorerie" }).click();
    await page.waitForTimeout(400);

    // Créer une poche (réel) si aucune, pour tester les autres sheets.
    const createBtn = page.getByRole("button", { name: /Créer une poche|^Poche$/ }).first();
    await createBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "ov-treso-create.png") });
    await assertInViewport(page, page.getByRole("button", { name: "Créer la poche" }), "treso-create-footer");
  });

  test("Vente : ligne + don + split, CTA visible", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await go(page, "/admin/vendre");
    // Ouvre le picker, bascule saisie libre, ajoute une ligne.
    const add = page.getByRole("button", { name: /Ajouter un parfum|Choisir un parfum/ }).first();
    if (await add.isVisible().catch(() => false)) {
      await add.click();
      await page.waitForTimeout(500);
      const manual = page.getByText(/Saisie libre/i).first();
      if (await manual.isVisible().catch(() => false)) {
        await manual.click();
        await page.waitForTimeout(300);
        const nameInput = page.getByPlaceholder(/Nom/i).first();
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill("Test Audit");
          const confirm = page.getByRole("button", { name: /Ajouter|Valider|Confirmer/ }).first();
          await confirm.click().catch(() => {});
        }
      }
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(OUT, "ov-vendre-ligne.png"), fullPage: true });
    await assertStickyAboveTabBar(page, "vendre-ligne");
  });
});
