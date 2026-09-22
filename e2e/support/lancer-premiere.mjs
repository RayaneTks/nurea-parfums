/**
 * Lanceur du parcours PC-12 « Première utilisation » (06 PC-12, 07 §3.5).
 *
 * Ce parcours est le seul à exiger une base VIDE : le jeu partagé de `e2e/fixtures/seed.ts` porte
 * des poches, des parfums et des documents, et le « vide de départ » de l'Accueil (05 §5.1) y est
 * donc inatteignable. Il tourne sur son propre harnais — base `nurea_test_e2e_vide`, ports 3102 et
 * 3103, aucun seed —, dans une exécution Playwright à part.
 *
 * Pourquoi un lanceur plutôt qu'une variable posée dans le script npm : `E2E_PREMIERE=1 playwright …`
 * n'est pas portable (le shell de npm sous Windows est `cmd.exe`, qui ne connaît pas cette forme).
 * Ici, la variable est posée par Node puis héritée par Playwright et par ses processus ouvriers —
 * c'est ce qui fait que `e2e/support/env.ts` répond la même chose des deux côtés.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const playwright = path.join(racine, "node_modules", "@playwright", "test", "cli.js");

const resultat = spawnSync(
  process.execPath,
  [playwright, "test", "parcours/premiere-utilisation", "--project=Mobile-premiere", ...process.argv.slice(2)],
  { cwd: racine, stdio: "inherit", env: { ...process.env, E2E_PREMIERE: "1" } },
);

process.exit(resultat.status ?? 1);
