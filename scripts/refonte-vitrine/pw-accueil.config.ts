// e2e de l'accueil de la vitrine sans base ni gestion : serveur de dev sur localhost:3000.
// node node_modules/@playwright/test/cli.js test -c scripts/refonte-vitrine/pw-accueil.config.ts parcours/accueil-snapchat.spec.ts
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "../../e2e",
  testMatch: ["parcours/accueil-snapchat.spec.ts", "perfume-sheet.spec.ts", "selection.spec.ts", "catalog-filters.spec.ts", "recherche-suggestions.spec.ts"],
  reporter: "line",
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "Mobile", use: { ...devices["Pixel 7"] } },
    { name: "Desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
