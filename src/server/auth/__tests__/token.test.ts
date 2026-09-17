import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { renewIfStale, signSessionToken, verifySessionToken, RENEW_AFTER_SECONDS } = await import("../token");
const { ConfigurationError } = await import("@/server/env");

/** Jeton de session (04 §8.2) : compatibilité avec l'existant, refus, renouvellement glissant. */

const SECRET = "un-secret-de-test-assez-long-pour-hs256";
const key = (secret: string) => new TextEncoder().encode(secret);

beforeEach(() => {
  vi.stubEnv("ADMIN_JWT_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** `signAdminToken` de `src/lib/admin/session.ts` sur `main`, à l'identique. */
function legacyToken(options: { secret?: string; expiration?: string | number; issuedAt?: number } = {}) {
  const jwt = new SignJWT({ username: "gerant", role: "OWNER" }).setProtectedHeader({ alg: "HS256" }).setSubject("admin-1");
  (options.issuedAt === undefined ? jwt.setIssuedAt() : jwt.setIssuedAt(options.issuedAt)).setExpirationTime(
    options.expiration ?? "7d",
  );
  return jwt.sign(key(options.secret ?? SECRET));
}

describe("verifySessionToken", () => {
  it("accepte un jeton au format de l'existant (revendication role), même secret", async () => {
    expect(await verifySessionToken(await legacyToken())).toMatchObject({ userId: "admin-1", username: "gerant" });
  });

  it("accepte le secret avec espaces autour, comme l'existant qui le rognait", async () => {
    vi.stubEnv("ADMIN_JWT_SECRET", `  ${SECRET}\n`);
    expect(await verifySessionToken(await legacyToken())).not.toBeNull();
  });

  it("aller-retour d'un jeton émis par la refonte, sans rôle", async () => {
    const token = await signSessionToken({ userId: "admin-1", username: "gerant" });
    const verified = await verifySessionToken(token);
    expect(verified).toMatchObject({ userId: "admin-1", username: "gerant" });
    expect(JSON.parse(Buffer.from(token.split(".")[1] as string, "base64url").toString())).not.toHaveProperty("role");
  });

  it("refuse : autre secret, expiré, falsifié, non signé, sans username", async () => {
    const valid = await legacyToken();
    const [header, payload] = valid.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "admin-1", username: "gerant", iat: 1, exp: 9999999999 })).toString("base64url");
    const unsigned = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${payload}.`;
    const noUsername = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("admin-1").setIssuedAt().setExpirationTime("7d").sign(key(SECRET));

    for (const token of [
      await legacyToken({ secret: "un-autre-secret-assez-long-pour-hs256" }),
      // `exp` absolu : une durée relative compterait depuis maintenant, pas depuis `iat`.
      await legacyToken({ issuedAt: Math.floor(Date.now() / 1000) - 8 * 86_400, expiration: Math.floor(Date.now() / 1000) - 86_400 }),
      `${header}.${forgedPayload}.${valid.split(".")[2]}`,
      unsigned,
      noUsername,
      "pas-un-jeton",
    ]) {
      expect(await verifySessionToken(token)).toBeNull();
    }
  });

  it("secret absent ou trop court : ConfigurationError, pas un simple refus", async () => {
    const token = await legacyToken();
    vi.stubEnv("ADMIN_JWT_SECRET", "court");
    await expect(verifySessionToken(token)).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe("renewIfStale (renouvellement glissant, 04 §8.2)", () => {
  it("ne renouvelle pas un jeton de moins de 24 h, renouvelle au-delà", async () => {
    const now = Date.now();
    const issuedAt = Math.floor(now / 1000);
    const session = { userId: "admin-1", username: "gerant", issuedAt };
    expect(await renewIfStale(session, now + RENEW_AFTER_SECONDS * 1000)).toBeNull();
    const renewed = await renewIfStale(session, now + (RENEW_AFTER_SECONDS + 1) * 1000);
    expect(renewed).not.toBeNull();
    expect(await verifySessionToken(renewed as string)).toMatchObject({ userId: "admin-1", username: "gerant" });
  });
});
