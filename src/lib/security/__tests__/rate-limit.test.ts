import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter, hashKey, rateLimitKey } from "../rate-limit";

describe("createRateLimiter", () => {
  it("laisse passer la limite, puis refuse", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1_000 });
    expect([1, 2, 3].map(() => limiter.check("a", 0).ok)).toEqual([true, true, true]);
    expect(limiter.check("a", 0)).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 1 });
  });

  it("décompte les essais restants", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.check("a", 0).remaining).toBe(2);
    expect(limiter.check("a", 0).remaining).toBe(1);
    expect(limiter.check("a", 0).remaining).toBe(0);
  });

  it("rouvre la fenêtre une fois l'échéance passée", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("a", 999).ok).toBe(false);
    expect(limiter.check("a", 1_000).ok).toBe(true);
  });

  it("annonce le temps d'attente restant, jamais zéro", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000 });
    limiter.check("a", 0);
    expect(limiter.check("a", 5_000).retryAfterSeconds).toBe(5);
    expect(limiter.check("a", 9_999).retryAfterSeconds).toBe(1);
  });

  it("compte chaque clé pour elle-même", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("b", 0).ok).toBe(true);
    expect(limiter.check("a", 0).ok).toBe(false);
  });

  it("ne laisse pas la table grossir sans borne", () => {
    const limiter = createRateLimiter({ limit: 10, windowMs: 1_000, maxKeys: 8 });
    for (let index = 0; index < 50; index += 1) limiter.check(`client-${index}`, 0);
    expect(limiter.size).toBeLessThanOrEqual(8);
  });

  it("purge d'abord les fenêtres expirées, et ne perd pas les vivantes", () => {
    const limiter = createRateLimiter({ limit: 10, windowMs: 1_000, maxKeys: 4 });
    for (const key of ["a", "b", "c"]) limiter.check(key, 0);
    limiter.check("vivant", 2_000);
    limiter.check("autre", 2_000);
    expect(limiter.check("vivant", 2_000).remaining).toBe(8);
  });

  it("refuse une configuration absurde", () => {
    expect(() => createRateLimiter({ limit: 0, windowMs: 1_000 })).toThrow();
    expect(() => createRateLimiter({ limit: 1, windowMs: 0 })).toThrow();
  });
});

describe("clientIp", () => {
  it("prend la première adresse de x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" }))).toBe("203.0.113.5");
  });

  it("retombe sur x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("sans en-tête, une clé commune plutôt qu'aucune limite", () => {
    expect(clientIp(new Headers())).toBe("inconnue");
  });
});

describe("hashKey", () => {
  it("est stable et ne rend pas l'adresse", () => {
    const hash = hashKey("203.0.113.5");
    expect(hash).toBe(hashKey("203.0.113.5"));
    expect(hash).not.toContain("203");
  });

  it("sépare deux adresses voisines", () => {
    expect(hashKey("203.0.113.5")).not.toBe(hashKey("203.0.113.6"));
  });
});

describe("rateLimitKey", () => {
  it("sépare deux points d'entrée pour une même adresse", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5" });
    expect(rateLimitKey("contact", headers)).not.toBe(rateLimitKey("login", headers));
  });
});
