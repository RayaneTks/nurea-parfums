/**
 * Chiffres canoniques d'une période sur la base e2e, calculés par LES fragments de `src/server/chiffres/sql.ts`
 * (les mêmes que les écrans) : le test confronte ce que l'écran affiche à la définition (04 §16.4, 07 J12).
 *
 * Processus à part, lancé par `e2e/helpers/chiffres.ts` : les modules serveur commencent par `import "server-only"`,
 * qui lève hors de la condition `react-server` — on le neutralise ici, comme `scripts/check-invariants.ts`.
 *
 *   DATABASE_URL=… node node_modules/tsx/dist/cli.mjs e2e/support/chiffres-canoniques.ts '{"periode":"month@2026-07-10"}'
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("chiffres-canoniques : DATABASE_URL requise.");
  const { assertNotProduction } = await import("../../scripts/lib/garde-hote");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: assertNotProduction(url, "Chiffres canoniques e2e") });
  try {
    const request = JSON.parse(process.argv[2] ?? "{}") as { periode?: string };
    const { parsePeriod } = await import("../../src/contracts/chiffres");
    const sql = await import("../../src/server/chiffres/sql");
    const dto = await import("../../src/server/chiffres/dto");
    const now = new Date();
    const period = parsePeriod(request.periode ?? "all");
    if (!period) throw new Error(`chiffres-canoniques : période illisible « ${request.periode} ».`);
    const [marge] = await db.$queryRaw<{ margeNette: import("../../src/server/chiffres/dto").MargeNetteJson }[]>(sql.margeNetteSql({ period, now }));
    const out = {
      encaisse: dto.encaisseDto(await db.$queryRaw(sql.encaisseSql({ period, now }))),
      margeNette: dto.margeNetteDto(marge?.margeNette as import("../../src/server/chiffres/dto").MargeNetteJson),
      aEncaisser: dto.aEncaisserDto(await db.$queryRaw(sql.aEncaisserSql({ now }))),
      tresorerie: dto.tresorerieDto(await db.$queryRaw(sql.tresorerieSql())),
      coutACompleter: dto.documentSetDto(await db.$queryRaw(sql.coutACompleterSql({ period, now }))),
      documentsDeLaPeriode: dto.documentSetDto(await db.$queryRaw(sql.documentsDeLaPeriodeSql(period, now))),
    };
    process.stdout.write(`${JSON.stringify(out)}\n`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
