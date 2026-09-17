import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminWebManifest } from "@/lib/pwa/manifests";
import { OFFLINE_MESSAGE, OUTDATED_MESSAGE, clientActionError, reservesText } from "../hooks/action-errors";
import { COALESCE_DELAY_MS, createCoalescer } from "../hooks/coalesce";
import { DRAFT_TTL_MS, readDraft, storageKey, writeDraft, type StorageLike } from "../hooks/draft-store";
import { applyUrlPatch, readEnum } from "../hooks/url-patch";
import { PreprodBanner } from "../PreprodBanner";
import { PREPROD_BANNER_TEXT, PREPROD_NAME_SUFFIX, isPreprod } from "../preprod";
import { PULL_MAX_PX, PULL_THRESHOLD_PX, isPullReady, pullDistance, remainingVisibleMs } from "../pull-to-refresh";
import { hasSessionHint } from "../session-hint";
import { computeViewport } from "../viewport";

describe("service viewport (05 §2.8)", () => {
  it("clavier ouvert : hauteur visible et inset", () => {
    expect(computeViewport({ innerHeight: 844, visualHeight: 508, offsetTop: 0, scale: 1 }, null)).toEqual({
      vh: 508,
      keyboardInset: 336,
      offsetTop: 0,
    });
  });

  it("iOS fait défiler le viewport visuel : le décalage n'est pas du clavier", () => {
    expect(computeViewport({ innerHeight: 844, visualHeight: 508, offsetTop: 120, scale: 1 }, null).keyboardInset).toBe(216);
  });

  it("un zoom au pincement n'ouvre pas de clavier imaginaire", () => {
    const previous = { vh: 844, keyboardInset: 0, offsetTop: 0 };
    expect(computeViewport({ innerHeight: 844, visualHeight: 422, offsetTop: 0, scale: 2 }, previous)).toBe(previous);
  });

  it("sans visualViewport : la fenêtre, sans inset", () => {
    expect(computeViewport({ innerHeight: 700.4, visualHeight: null, offsetTop: 0, scale: 1 }, null)).toEqual({
      vh: 700,
      keyboardInset: 0,
      offsetTop: 0,
    });
  });
});

describe("brouillons (04 §3.7)", () => {
  const memory = (): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  };

  it("restaure ce qui a été saisi, identifiant compris", () => {
    const storage = memory();
    writeDraft(storage, "vendre", { id: "doc-1", lines: 2 }, 1_000);
    expect(readDraft(storage, "vendre", 2_000)).toEqual({ value: { id: "doc-1", lines: 2 }, savedAt: 1_000 });
  });

  it("expire après 24 h et nettoie le stockage", () => {
    const storage = memory();
    writeDraft(storage, "vendre", { id: "doc-1" }, 0);
    expect(readDraft(storage, "vendre", DRAFT_TTL_MS + 1)).toBeNull();
    expect(storage.data.has(storageKey("vendre"))).toBe(false);
  });

  it("un brouillon illisible ne casse rien", () => {
    const storage = memory();
    storage.setItem(storageKey("vendre"), "{pas du json");
    expect(readDraft(storage, "vendre")).toBeNull();
  });

  it("stockage refusé (navigation privée) : aucune exception", () => {
    const refusing: StorageLike = {
      getItem: () => {
        throw new Error("refusé");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    expect(() => writeDraft(refusing, "vendre", {})).not.toThrow();
    expect(readDraft(refusing, "vendre")).toBeNull();
  });
});

describe("coalescence (04 §3.7)", () => {
  afterEach(() => vi.useRealTimers());

  it("dix taps rapides : un envoi, la dernière valeur, 400 ms après le dernier", () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const c = createCoalescer<number>(send);
    for (let q = 1; q <= 10; q += 1) {
      c.schedule(q);
      vi.advanceTimersByTime(100);
    }
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(COALESCE_DELAY_MS);
    expect(send.mock.calls).toEqual([[10]]);
  });

  it("flush envoie tout de suite, cancel oublie", () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const c = createCoalescer<number>(send);
    c.schedule(3);
    c.flush();
    c.schedule(4);
    c.cancel();
    vi.advanceTimersByTime(COALESCE_DELAY_MS * 2);
    expect(send.mock.calls).toEqual([[3]]);
    expect(c.hasPending()).toBe(false);
  });
});

describe("état d'URL (04 §3.7)", () => {
  it("retire les valeurs vides et le défaut, garde le reste", () => {
    expect(applyUrlPatch("/admin/commandes", "vue=livrees&q=fa", { q: "" })).toBe("/admin/commandes?vue=livrees");
    expect(applyUrlPatch("/admin/commandes", "vue=livrees", { vue: "a-livrer" }, { vue: "a-livrer" })).toBe("/admin/commandes");
    expect(applyUrlPatch("/admin/lots/1", "", { assigner: true })).toBe("/admin/lots/1?assigner=1");
  });

  it("une valeur inconnue se lit comme le défaut", () => {
    expect(readEnum("ready", ["a-livrer", "livrees"] as const, "a-livrer")).toBe("a-livrer");
    expect(readEnum("livrees", ["a-livrer", "livrees"] as const, "a-livrer")).toBe("livrees");
  });
});

describe("erreurs côté client (04 §9.2)", () => {
  it("réseau coupé : OFFLINE réessayable, message vrai", () => {
    expect(clientActionError(new TypeError("Failed to fetch"), { online: true, outdated: false })).toEqual({
      code: "OFFLINE",
      message: OFFLINE_MESSAGE,
      retryable: true,
    });
  });

  it("déploiement plus récent que l'écran : recharger", () => {
    expect(clientActionError(new Error("x"), { online: true, outdated: true }).message).toBe(OUTDATED_MESSAGE);
  });

  it("autre exception : UNEXPECTED non réessayable", () => {
    expect(clientActionError(new Error("x"), { online: true, outdated: false })).toMatchObject({ code: "UNEXPECTED", retryable: false });
  });

  it("les réserves du domaine sont le texte du dialogue", () => {
    expect(
      reservesText({
        code: "NEEDS_CONFIRMATION",
        message: "",
        retryable: false,
        confirm: { title: "Livrer ?", reserves: ["Il reste 40,00 € à encaisser.", "Stock de Sauvage à 1."], confirmLabel: "Livrer" },
      }),
    ).toBe("Il reste 40,00 € à encaisser. Stock de Sauvage à 1.");
  });
});

describe("tirer pour rafraîchir (05 §4.3)", () => {
  it("résistance, plafond et seuil", () => {
    expect(pullDistance(-10)).toBe(0);
    expect(pullDistance(100)).toBe(50);
    expect(pullDistance(1000)).toBe(PULL_MAX_PX);
    expect(isPullReady(pullDistance(2 * PULL_THRESHOLD_PX))).toBe(true);
    expect(isPullReady(PULL_THRESHOLD_PX - 1)).toBe(false);
  });

  it("l'indicateur reste au moins 300 ms, jamais plus que la vraie attente au-delà", () => {
    expect(remainingVisibleMs(1_000, 1_050)).toBe(250);
    expect(remainingVisibleMs(1_000, 2_000)).toBe(0);
  });
});

describe("préproduction (07 §1.3, garde-fou 6)", () => {
  it("se lit sur NUREA_ENV=preprod seulement", () => {
    expect(isPreprod({ NUREA_ENV: "preprod" })).toBe(true);
    expect(isPreprod({ NUREA_ENV: " preprod " })).toBe(true);
    expect(isPreprod({ NUREA_ENV: "production" })).toBe(false);
    expect(isPreprod({})).toBe(false);
  });

  it("le bandeau dit l'essai, sans bouton pour le fermer", () => {
    const html = renderToStaticMarkup(<PreprodBanner />);
    expect(html).toContain(PREPROD_BANNER_TEXT);
    expect(html).toContain("Essai — ces données seront effacées");
    expect(html).not.toContain("<button");
  });

  it("le manifeste est suffixé « (essai) » seulement quand on le demande", () => {
    expect(getAdminWebManifest().short_name).toBe("Nuréa Gestion");
    const preprod = getAdminWebManifest({ nameSuffix: PREPROD_NAME_SUFFIX });
    expect(preprod.short_name).toBe("Nuréa Gestion (essai)");
    expect(preprod.name).toMatch(/\(essai\)$/);
  });
});

describe("témoin de session (06 E18)", () => {
  it("ne vaut que « 1 »", () => {
    expect(hasSessionHint("1")).toBe(true);
    expect(hasSessionHint("")).toBe(false);
    expect(hasSessionHint(undefined)).toBe(false);
  });
});
