import { execFileSync } from "node:child_process";
import path from "node:path";
import type { DashboardFiguresDTO, DocumentSetDTO, MargeNetteDTO, PocketEncaisseDTO, TresorerieDTO } from "../../src/contracts/chiffres";
import type { TopPerfumesDTO } from "../../src/contracts/stats";
import type { MoneyString } from "../../src/domain/money";
import { eurFromWire, formatEur } from "../../src/domain/money";
import { E2E_DATABASE_URL, E2E_REMOTE } from "../support/env";

export type ChiffresCanoniques = {
  encaisse: MoneyString;
  margeNette: MargeNetteDTO;
  aEncaisser: MoneyString;
  tresorerie: TresorerieDTO;
  coutACompleter: DocumentSetDTO;
  documentsDeLaPeriode: DocumentSetDTO;
  /** J14 — le composite de l'Accueil, sans les alertes de stock (elles viennent du catalogue). */
  tableauDeBord: Omit<DashboardFiguresDTO, "stock">;
  enRetard: DocumentSetDTO;
  /** Créances anciennes : nombre de GROUPES de E13 (le compteur de l'alerte) et de documents. */
  creancesAnciennes: { clients: number; documents: number };
  classement: TopPerfumesDTO;
  /** Récap du jour demandé (`jour`, ou aujourd'hui). */
  jour: { encaisse: MoneyString; parPoche: PocketEncaisseDTO[]; documents: string[] };
};

/**
 * Chiffres d'une période calculés par les fragments canoniques (`e2e/support/chiffres-canoniques.ts`), sur la base
 * e2e locale uniquement. « Le chiffre affiché est confronté à la requête de 03 §5 exécutée sur la base de test »
 * (04 §16.4).
 */
export function chiffresCanoniques(periode: string, jour: string | null = null): ChiffresCanoniques {
  if (E2E_REMOTE) throw new Error("Chiffres canoniques : jamais en mode distant.");
  const root = process.cwd();
  const output = execFileSync(
    process.execPath,
    [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), path.join("e2e", "support", "chiffres-canoniques.ts"), JSON.stringify({ periode, jour })],
    { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, DIRECT_URL: E2E_DATABASE_URL } },
  );
  const line = output.trim().split("\n").at(-1) ?? "{}";
  return JSON.parse(line) as ChiffresCanoniques;
}

/**
 * « 1 240,00 € » tel que l'écran l'écrit (`Money` : espace fine insécable). `compact` : la forme des tuiles
 * KPI, qui masque des centimes NULS (« 1 240 € ») — celle du bloc Argent de l'Accueil.
 */
export const shown = (value: MoneyString, options?: { signed?: boolean; compact?: boolean }) =>
  formatEur(eurFromWire(value), options);
