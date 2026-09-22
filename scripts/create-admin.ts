/**
 * Crée le compte de la gestion, ou en remplace le mot de passe (verrou de connexion levé). Aucun rôle
 * (04 §8.1). L'écriture passe par le writer `src/server/auth/writer.ts`, seul propriétaire de
 * `AdminUser` (04 §4.3).
 *
 * Usage :
 *   DATABASE_URL=<url> npx tsx --conditions=react-server scripts/create-admin.ts <identifiant> <mot-de-passe> [--confirm-host <hôte>]
 *   npm run admin:create-user -- <identifiant> <mot-de-passe> --confirm-host <hôte>   (lit .env.local)
 *
 * `--conditions=react-server` : les modules serveur commencent par `import "server-only"`, qui ne se
 * charge que sous cette condition. La production n'est acceptée qu'avec `--confirm-host` reproduisant
 * exactement son hôte (07 §1.3, garde-fou 5).
 */
import { assertHostConfirmed, HostRefusedError } from "./lib/garde-hote";

// Lu AVANT tout import de @prisma/client, qui charge `.env` (la production) dans process.env.
const DATABASE_URL = process.env.DATABASE_URL;

const USAGE =
  "Usage : DATABASE_URL=<url> npx tsx --conditions=react-server scripts/create-admin.ts <identifiant> <mot-de-passe> [--confirm-host <hôte>]";

const MIN_PASSWORD_LENGTH = 10;
const BCRYPT_COST = 12;

function parseArgs(argv: readonly string[]) {
  const positional: string[] = [];
  let confirmHost: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm-host") {
      confirmHost = argv[i + 1];
      i += 1;
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }
  return { username: (positional[0] ?? "").trim().toLowerCase(), password: positional[1] ?? "", confirmHost };
}

async function main(): Promise<number> {
  const { username, password, confirmHost } = parseArgs(process.argv.slice(2));
  if (!username || !password) {
    console.error(USAGE);
    return 1;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Mot de passe trop court : ${MIN_PASSWORD_LENGTH} caractères au moins.`);
    return 1;
  }

  const url = assertHostConfirmed(DATABASE_URL, confirmHost, "Création du compte de la gestion");
  process.env.DATABASE_URL = url;

  try {
    await import("server-only");
  } catch {
    console.error(`Relance avec --conditions=react-server (modules serveur).\n${USAGE}`);
    return 1;
  }

  const [{ default: bcrypt }, { inTransaction }, authWriter, { prisma }] = await Promise.all([
    import("bcryptjs"),
    import("@/server/db/transaction"),
    import("@/server/auth/writer"),
    import("@/lib/db/prisma"),
  ]);
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const account = await inTransaction((tx) => authWriter.upsertAccount(tx, { username, passwordHash }));
    console.log(`OK — compte ${account.username} prêt.`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    console.error(e instanceof HostRefusedError ? e.message : e);
    process.exit(1);
  });
