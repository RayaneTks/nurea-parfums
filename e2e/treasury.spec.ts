import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "audit-shots");
fs.mkdirSync(OUT, { recursive: true });
const HAS_TOKEN = fs.existsSync("/tmp/admin_token.txt");

async function login(page: Page) {
  const token = fs.readFileSync("/tmp/admin_token.txt", "utf8").trim();
  await page.context().addCookies([
    { name: "nurea_admin", value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
  ]);
}

test.describe("Trésorerie", () => {
  test.skip(!HAS_TOKEN, "Local uniquement.");
  test.use({ viewport: { width: 390, height: 844 } });

  test("onglet Trésorerie rend (poches/total/rappel)", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page);
    await page.goto("/admin/compta", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const tab = page.getByRole("radio", { name: "Trésorerie" });
    await expect(async () => {
      await tab.click();
      await expect(page.getByText(/Trésorerie totale/i)).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });

    await page.screenshot({ path: path.join(OUT, "treso-tab.png") });
  });
});
