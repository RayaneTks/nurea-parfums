import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Audit visuel mobile (iPhone 13) — login réel + screenshot full-page de
 * toutes les routes admin et des principales modales/sheets.
 * Lancer : npx playwright test audit-screenshots --project=Mobile
 */

const OUT = path.join(process.cwd(), "audit-shots");
fs.mkdirSync(OUT, { recursive: true });

const USER = "admin";
const PASS = "MotDePasseLocal123!";

async function login(page: Page) {
  // Le cookie de session est `secure` en prod → rejeté sur http://localhost.
  // On injecte directement un JWT valide (signé avec le même secret).
  const token = fs.readFileSync("/tmp/admin_token.txt", "utf8").trim();
  await page.context().addCookies([
    {
      name: "nurea_admin",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  void USER;
  void PASS;
}

async function go(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: "commit", timeout: 45_000 });
  } catch {
    /* best-effort : on screenshot quand même l'état courant */
  }
  // attend que le réseau se calme (RSC + données), sans bloquer
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => {});
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(1800); // laisse le rendu/skeletons se résoudre
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

// Récupère un id de commande / vente / client / lot pour les pages détail.
async function firstHref(page: Page, urlContains: string): Promise<string | null> {
  const links = await page.locator(`a[href*="${urlContains}"]`).all();
  for (const l of links) {
    const href = await l.getAttribute("href");
    if (href && href.includes(urlContains)) return href;
  }
  return null;
}

// Outil de dev local : nécessite un serveur lancé + un JWT admin injecté
// dans /tmp/admin_token.txt (voir scripts d'audit). Skip en CI / sans token.
const HAS_TOKEN = fs.existsSync("/tmp/admin_token.txt");

test.describe("Audit visuel mobile", () => {
  test.skip(!HAS_TOKEN, "Audit local uniquement (token admin absent).");
  test.use({ viewport: { width: 390, height: 844 } });

  test("capture toutes les interfaces", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);

    // ── Pages principales (tab bar) ──
    const routes: Array<[string, string]> = [
      ["/admin", "01-dashboard"],
      ["/admin/ordres", "02-commandes"],
      ["/admin/ordres/new?mode=quick", "03-commande-rapide"],
      ["/admin/ordres/new", "04-commande-full"],
      ["/admin/vendre", "05-vendre"],
      ["/admin/compta", "06-compta"],
      ["/admin/lots", "07-lots"],
      ["/admin/lots/new", "08-lot-new"],
      ["/admin/clients", "09-clients"],
      ["/admin/clients/new", "10-client-new"],
      ["/admin/catalogue", "11-catalogue"],
    ];
    for (const [url, name] of routes) {
      await go(page, url);
      await shot(page, name);
    }

    // ── Détails (dépendent des données seedées) ──
    await go(page, "/admin/ordres");
    const orderHref = await firstHref(page, "/admin/ordres/");
    if (orderHref) {
      await go(page, orderHref);
      await shot(page, "12-commande-detail");
    }

    await go(page, "/admin/clients");
    const clientHref = await firstHref(page, "/admin/clients/");
    if (clientHref && !clientHref.endsWith("/new")) {
      await go(page, clientHref);
      await shot(page, "13-client-detail");
    }

    await go(page, "/admin/lots");
    const lotLinks = await page.locator('a[href*="/admin/lots/"]').all();
    let lotHref: string | null = null;
    for (const l of lotLinks) {
      const h = await l.getAttribute("href");
      if (h && /\/admin\/lots\/[^/]+$/.test(h) && !h.endsWith("/new")) {
        lotHref = h;
        break;
      }
    }
    if (lotHref) {
      await go(page, lotHref);
      await shot(page, "14-lot-detail");
    }

    // ── Sheet : PerfumePicker depuis Vendre ──
    await go(page, "/admin/vendre");
    await page.waitForTimeout(700);
    const addBtn = page.getByRole("button", { name: /Ajouter un parfum/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await shot(page, "15-perfumepicker-catalog");
      // bascule saisie libre si dispo
      const manualTab = page.getByText(/Saisie libre/i).first();
      if (await manualTab.isVisible().catch(() => false)) {
        await manualTab.click();
        await shot(page, "16-perfumepicker-manual");
      }
    }

    // ── Sheet : CustomerCombobox depuis Vendre ──
    await go(page, "/admin/vendre");
    await page.waitForTimeout(700);
    const clientField = page.getByText(/Rechercher ou créer/i).first();
    if (await clientField.isVisible().catch(() => false)) {
      await clientField.click();
      await shot(page, "17-customer-combobox");
    }

    expect(true).toBeTruthy();
  });
});
