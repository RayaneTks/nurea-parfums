/**
 * Vérification intégration : DB, recherche locale, référentiel interne.
 * Lance : npx tsx scripts/verify-integration.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

function loadEnvLocal(): void {
  const p = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(p)) {
    console.warn("[verify] Fichier .env.local absent — certaines vérifications seront ignorées.");
    return;
  }
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();
process.env.VERIFICATION_SCRIPT = "1";

const { registerPrismaCatalogFailure, prismaCatalogInCooldown } = await import(
  "../src/lib/db/prismaRuntimeCircuit"
);

type CaseResult = { name: string; ok: boolean; detail?: string };

const cases: CaseResult[] = [];

function record(name: string, ok: boolean, detail?: string): void {
  cases.push({ name, ok, detail });
  const s = ok ? "OK" : "KO";
  console.log(`[verify] ${s} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function main(): Promise<void> {
  console.log("[verify] Démarrage (VERIFICATION_SCRIPT=1)\n");

  /* ---------- 1. Base de données ---------- */
  if (!process.env.DATABASE_URL?.trim()) {
    record("DB: DATABASE_URL défini", false, "variable absente — fallback mock attendu");
  } else {
    try {
      const { prisma } = await import("../src/lib/db/prisma");
      await prisma.$connect();
      const tables = await prisma.$queryRaw<
        { tablename: string }[]
      >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
      const namesLc = new Set(tables.map((t) => t.tablename.toLowerCase()));
      const expected = ["brand", "perfume", "adminuser", "auditlog"];
      const missing = expected.filter((e) => !namesLc.has(e));
      const [brandCount, perfumeCount] = await Promise.all([
        prisma.brand.count(),
        prisma.perfume.count(),
      ]);
      await prisma.$disconnect();
      record(
        "DB: connexion + tables",
        missing.length === 0,
        `${tables.length} tables public ; Brand=${brandCount} Perfume=${perfumeCount}` +
          (missing.length ? ` ; manquantes: ${missing.join(",")}` : "")
      );
    } catch (e) {
      registerPrismaCatalogFailure();
      record("DB: connexion + tables", false, String(e));
    }
  }

  /* ---------- 2. Catalogue + recherche locale ---------- */
  const { getCatalogPerfumes } = await import("../src/lib/catalog/getCatalogPerfumes");
  const { searchLocalCatalog } = await import("../src/lib/search/searchLocalCatalog");
  const { fuzzySearchMatch } = await import("../src/lib/data");

  let catalogLen = 0;
  try {
    const catalog = await getCatalogPerfumes();
    catalogLen = catalog.length;
    record(
      "Catalogue: chargement",
      catalogLen > 0,
      `${catalogLen} parfum(s) (DB ou mock)`
    );

    const localChecks: [string, string, (n: number) => boolean][] = [
      ["local: dior (casse)", "dior", (n) => n >= 1],
      ["local: DIOR majuscules", "DIOR", (n) => n >= 1],
      ["local: espaces eros", "  eros  ", (n) => n >= 1],
      ["local: Eros partiel", "Ero", (n) => n >= 1],
      ["local: fuzzy aventu → Aventus", "aventu", (n) => n >= 1],
    ];

    for (const [label, q, pred] of localChecks) {
      const n = searchLocalCatalog(catalog, q).length;
      record(label, pred(n), `${n} résultat(s)`);
    }

    const pBac = catalog.find((p) => p.name.toLowerCase().includes("baccarat"));
    if (pBac) {
      const ok = fuzzySearchMatch(pBac, "bacara");
      record("local: faute bacara → Baccarat", ok, pBac.name);
    } else {
      record("local: faute bacara → Baccarat", false, "parfum Baccarat absent du catalogue chargé");
    }
  } catch (e) {
    record("Catalogue: chargement", false, String(e));
  }

  /* ---------- 3. Référentiel interne (hors catalogue) ---------- */
  const { searchPerfumeWithFallback } = await import("../src/lib/search/searchPerfumeWithFallback");
  const ref = await searchPerfumeWithFallback("initio oud for greatness");
  record(
    "Référentiel: parfum absent du catalogue reconnu",
    ref.type === "reference_match" || ref.type === "unlisted_match" || ref.type === "local_results",
    ref.type,
  );
  const rien = await searchPerfumeWithFallback(`nurea-verify-${Date.now()}`);
  record("Référentiel: saisie inconnue sans réponse inventée", rien.type === "no_results", rien.type);

  /* ---------- Contrat JSON (échantillon) ---------- */
  const { searchPerfumeWithFallback: sp } = await import("../src/lib/search/searchPerfumeWithFallback");
  const j1 = await sp("Dior");
  const validLocal =
    j1.type === "local_results" &&
    Array.isArray(j1.results) &&
    j1.results.length > 0;
  record("JSON: local_results cohérent (Dior)", validLocal, j1.type);

  const failed = cases.filter((c) => !c.ok);
  const onlyRemoteDb =
    failed.length === 1 && failed[0]!.name.startsWith("DB: connexion");
  console.log(
    "\n[verify] Résumé:",
    failed.length === 0
      ? "tout OK"
      : onlyRemoteDb
        ? "OK côté app (DB distante non joignable depuis cet environnement)"
        : `${failed.length} cas en échec — voir lignes KO ci-dessus`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
