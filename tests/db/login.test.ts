import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "./support/database";
import { TEST_JWT_SECRET, memoryCookies, useTestDatabaseForServer } from "./support/server";

/**
 * Connexion (04 §8.5) sur un vrai PostgreSQL : message indifférencié, backoff persistant sur
 * `AdminUser.failedLoginCount` / `lockedUntil`, destination `retour` sans redirection ouverte.
 */

const cookieJar = vi.hoisted(() => ({ current: undefined as undefined | ReturnType<typeof memoryCookies> }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current?.store }));

type Server = typeof import("@/server/auth/actions") & typeof import("@/server/auth/token") & typeof import("@/lib/db/prisma");

let server: Server;

const USERNAME = "gerant";
const PASSWORD = "mot-de-passe-du-gerant";
const INCORRECT = "Identifiant ou mot de passe incorrect.";

beforeAll(async () => {
  await useTestDatabaseForServer();
  server = {
    ...(await import("@/server/auth/actions")),
    ...(await import("@/server/auth/token")),
    ...(await import("@/lib/db/prisma")),
  };
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(server.prisma);
  cookieJar.current = memoryCookies();
  // Coût 4 : la vérification reste un vrai bcrypt, sans ralentir la suite.
  await server.prisma.adminUser.create({
    data: { id: "admin-1", username: USERNAME, passwordHash: await bcrypt.hash(PASSWORD, 4) },
  });
});

const account = () => server.prisma.adminUser.findUniqueOrThrow({ where: { username: USERNAME } });

/** Fait expirer le verrou en cours, comme si l'attente était passée. */
const expireLock = () =>
  server.prisma.$executeRawUnsafe(`UPDATE "AdminUser" SET "lockedUntil" = now() - interval '1 second'`);

function lockMinutes(user: { lockedUntil: Date | null; updatedAt: Date }): number | null {
  return user.lockedUntil ? Math.round((user.lockedUntil.getTime() - user.updatedAt.getTime()) / 60_000) : null;
}

describe("loginAction : refus indifférencié", () => {
  it("identifiant inconnu et mauvais mot de passe rendent le même message, sans cookie", async () => {
    const unknown = await server.loginAction({ username: "personne", password: PASSWORD });
    const wrong = await server.loginAction({ username: USERNAME, password: "faux" });
    for (const result of [unknown, wrong]) {
      expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION", message: INCORRECT } });
    }
    expect(cookieJar.current?.jar.size).toBe(0);
  });

  it("identifiant normalisé (espaces, casse) : connexion acceptée, cookie de session valide", async () => {
    const result = await server.loginAction({ username: "  GERANT ", password: PASSWORD });
    expect(result).toEqual({ ok: true, data: { destination: "/admin" } });
    const token = cookieJar.current?.jar.get("nurea_admin");
    expect(token).toBeDefined();
    expect(await server.verifySessionToken(token as string)).toMatchObject({ userId: "admin-1", username: USERNAME });
  });
});

describe("loginAction : destination retour (04 §8.5)", () => {
  it.each([
    ["//exemple.com", "/admin"],
    ["https://exemple.com", "/admin"],
    ["/\\exemple.com", "/admin"],
    ["/admin/login", "/admin"],
    ["/ailleurs", "/admin"],
    ["/admin", "/admin"],
    ["/admin/commandes?doc=abc", "/admin/commandes?doc=abc"],
  ])("retour=%s ⇒ %s", async (retour, destination) => {
    const result = await server.loginAction({ username: USERNAME, password: PASSWORD, retour });
    expect(result).toEqual({ ok: true, data: { destination } });
  });
});

describe("loginAction : backoff persistant (04 §8.5)", () => {
  it("5 échecs ⇒ 1 min, puis 2, 4, 8, plafond 15 ; remise à zéro au succès", async () => {
    for (let i = 1; i <= 4; i += 1) {
      expect(await server.loginAction({ username: USERNAME, password: "faux" })).toMatchObject({
        ok: false,
        error: { message: INCORRECT },
      });
    }
    expect(await account()).toMatchObject({ failedLoginCount: 4, lockedUntil: null });

    const expectedMinutes = [1, 2, 4, 8, 15, 15];
    for (const [index, minutes] of expectedMinutes.entries()) {
      const result = await server.loginAction({ username: USERNAME, password: "faux" });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "CONFLICT", message: `Trop d'essais. Réessaie dans ${minutes} min.` },
      });
      const user = await account();
      expect(user.failedLoginCount).toBe(5 + index);
      expect(lockMinutes(user)).toBe(minutes);

      // Pendant le verrou, même le bon mot de passe est refusé, et l'essai n'est pas compté.
      expect(await server.loginAction({ username: USERNAME, password: PASSWORD })).toMatchObject({
        ok: false,
        error: { code: "CONFLICT" },
      });
      expect((await account()).failedLoginCount).toBe(5 + index);
      await expireLock();
    }

    const success = await server.loginAction({ username: USERNAME, password: PASSWORD });
    expect(success.ok).toBe(true);
    expect(await account()).toMatchObject({ failedLoginCount: 0, lockedUntil: null });
    expect(cookieJar.current?.jar.has("nurea_admin")).toBe(true);
  });

  it("deux essais simultanés comptent deux échecs (lecture sous verrou)", async () => {
    await Promise.all([
      server.loginAction({ username: USERNAME, password: "faux-1" }),
      server.loginAction({ username: USERNAME, password: "faux-2" }),
    ]);
    expect((await account()).failedLoginCount).toBe(2);
  });
});

describe("jeton au format de l'existant (bascule sans déconnexion, 07 J3)", () => {
  it("un jeton signé comme `signAdminToken` de main (revendication role) est accepté", async () => {
    // Reproduction exacte de src/lib/admin/session.ts sur main.
    const legacy = await new SignJWT({ username: USERNAME, role: "OWNER" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin-1")
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode((process.env.ADMIN_JWT_SECRET ?? TEST_JWT_SECRET).trim()));
    expect(await server.verifySessionToken(legacy)).toMatchObject({ userId: "admin-1", username: USERNAME });
  });
});
