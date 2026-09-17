/**
 * Crée un utilisateur admin (mot de passe hashé bcrypt).
 * Usage : dotenv -e .env.local -- npx tsx scripts/create-admin.ts <username> <mot-de-passe>
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = (process.argv[2] ?? "").trim().toLowerCase();
  const password = process.argv[3] ?? "";

  if (!username || !password) {
    console.error(
      "Usage : dotenv -e .env.local -- npx tsx scripts/create-admin.ts <username> <mot-de-passe>"
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("Mot de passe trop court (min. 10 caractères).");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash },
    update: { passwordHash, failedLoginCount: 0, lockedUntil: null },
  });

  console.log(`OK — compte ${user.username} prêt.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
