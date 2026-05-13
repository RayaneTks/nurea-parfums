/**
 * Crée un utilisateur admin (mot de passe hashé bcrypt).
 * Usage : dotenv -e .env.local -- npx tsx scripts/create-admin.ts <username> <mot-de-passe>
 * Rôle par défaut : OWNER (passer EDITOR ou VIEWER en 3e argument).
 */
import { PrismaClient, type AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = (process.argv[2] ?? "").trim().toLowerCase();
  const password = process.argv[3] ?? "";
  const roleArg = (process.argv[4] ?? "OWNER").toUpperCase() as AdminRole;

  if (!username || !password) {
    console.error(
      "Usage : dotenv -e .env.local -- npx tsx scripts/create-admin.ts <username> <mot-de-passe> [OWNER|EDITOR|VIEWER]"
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("Mot de passe trop court (min. 10 caractères).");
    process.exit(1);
  }

  const allowed: AdminRole[] = ["OWNER", "EDITOR", "VIEWER"];
  const role = allowed.includes(roleArg) ? roleArg : "OWNER";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash, role },
    update: { passwordHash, role },
  });

  console.log(`OK — admin ${user.username} (${user.role}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
