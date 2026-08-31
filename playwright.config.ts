import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Les invariants de mise en page rendent de vraies pages serveur : le process
// de test doit disposer d'`ADMIN_JWT_SECRET` pour signer une session valide.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "Mobile",
      use: {
        ...devices["iPhone 13"],
      },
    },
    {
      name: "Desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
    /* Désactive Prisma pendant les e2e si la DB n’est pas joignable depuis la machine de test. */
    env: {
      ...process.env,
      ...(process.env.E2E_MOCK_CATALOG_ONLY === "1" ? { DATABASE_URL: "" } : {}),
    },
  },
});
