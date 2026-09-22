import { describe, expect, it } from "vitest";
import { DomainError, NeedsConfirmation } from "../errors";
import { eurFromDb, type Eur } from "../money";
import {
  DOCUMENT_STATUSES,
  assertTransition,
  canTransition,
  initialStatus,
  isEngaged,
  isOverdue,
  reactivationTarget,
  statusLabel,
  timestampsAfter,
  transitionTitle,
  type DocumentStatus,
  type TransitionContext,
} from "../document-status";

const E = (text: string): Eur => eurFromDb(text);

const order: TransitionContext = {
  origin: "ORDER",
  total: E("100.00"),
  paid: E("0.00"),
  lineCount: 1,
};
const directSale: TransitionContext = { ...order, origin: "DIRECT_SALE", paid: E("100.00") };

/** Raccourci de lecture : les réserves d'un verdict favorable, jointes. */
function reserve(r: ReturnType<typeof canTransition>): string {
  return r.ok ? r.reserves.join(" ") : "";
}

/*
 * Ces tests décrivent un RENVERSEMENT de comportement hérité de `order-status.ts`.
 *
 * La première machine refusait quatre transitions : confirmer sans acompte, livrer avec un
 * solde dû, revenir en arrière avec des acomptes, dé-livrer une commande. Chacune décrivait le
 * cas courant, aucune la réalité — une commande offerte vaut 0 €, un client de confiance
 * emporte son flacon avant de payer, un clic se corrige.
 *
 * Ces refus sont des réserves à confirmer. On vérifie donc que `ok` est VRAI, et surtout qu'une
 * réserve accompagne chacun de ces cas : autoriser sans prévenir serait l'excès inverse.
 */
describe("canTransition — plus aucun mur, des réserves", () => {
  it("confirme sans acompte, en le signalant", () => {
    // Le cas rapporté : une commande offerte, total 0 €, aucun acompte.
    const r = canTransition("PENDING", "CONFIRMED", { ...order, total: E("0.00") });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/aucun acompte/i);
  });

  it("laisse sauter directement de « En attente » à « Livrée »", () => {
    // L'écran affiche les trois statuts côte à côte : la case du milieu n'est pas un péage.
    const r = canTransition("PENDING", "DELIVERED", order);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/directement/i);
  });

  it("livre avec un solde dû, en annonçant le montant exact", () => {
    const r = canTransition("CONFIRMED", "DELIVERED", { ...order, paid: E("99.00") });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toContain("1,00\u202F€");
  });

  it("revient en attente malgré des acomptes, en disant qu'ils restent dans l'Encaissé", () => {
    const r = canTransition("CONFIRMED", "PENDING", { ...order, paid: E("30.00") });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/30,00\u202F€.*Encaissé/);
  });

  it("dé-livre une commande, en prévenant que le pointage et le stock restent", () => {
    const r = canTransition("DELIVERED", "CONFIRMED", order);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/pointés comme livrés.*stock/i);
  });

  it("remet en attente une commande livrée, en le signalant", () => {
    const r = canTransition("DELIVERED", "PENDING", { ...order, paid: E("100.00") });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/début du suivi/);
    expect(reserve(r)).toMatch(/Encaissé/);
  });

  it("réactive une commande annulée : elle revient « En attente »", () => {
    // L'ancienne version en faisait un cul-de-sac : corriger un clic obligeait à tout ressaisir.
    expect(reactivationTarget("ORDER")).toBe("PENDING");
    const r = canTransition("CANCELLED", "PENDING", order);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/annulée/i);
  });

  it("signale une livraison sans aucun article", () => {
    const r = canTransition("CONFIRMED", "DELIVERED", { ...order, total: E("0.00"), lineCount: 0 });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/aucun article/i);
  });

  it("annule une commande livrée en disant que le stock est restitué", () => {
    const r = canTransition("DELIVERED", "CANCELLED", order);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/livrée.*stock est restitué/);
  });
});

describe("canTransition — ce qui passe sans rien demander", () => {
  /*
   * L'absence de réserve n'est pas un détail de confort : la confirmation automatique au
   * premier acompte (T7) ne se déclenche que sur un verdict sans réserve. Une réserve qui
   * apparaîtrait ici la ferait taire, et encaisser un acompte cesserait de confirmer.
   */
  it("confirme sans un mot quand l'acompte est là", () => {
    expect(canTransition("PENDING", "CONFIRMED", { ...order, paid: E("10.00") })).toEqual({
      ok: true,
      reserves: [],
    });
  });

  it("livre sans un mot quand tout est encaissé", () => {
    expect(canTransition("CONFIRMED", "DELIVERED", { ...order, paid: E("100.00") })).toEqual({
      ok: true,
      reserves: [],
    });
  });

  it("un trop-perçu n'invente pas de solde dû", () => {
    expect(canTransition("CONFIRMED", "DELIVERED", { ...order, paid: E("120.00") })).toEqual({
      ok: true,
      reserves: [],
    });
  });

  it("revient en attente sans un mot quand rien n'a été encaissé", () => {
    expect(canTransition("CONFIRMED", "PENDING", order)).toEqual({ ok: true, reserves: [] });
  });

  it("annule sans un mot depuis les statuts en cours", () => {
    expect(canTransition("PENDING", "CANCELLED", order)).toEqual({ ok: true, reserves: [] });
    expect(canTransition("CONFIRMED", "CANCELLED", order)).toEqual({ ok: true, reserves: [] });
  });
});

describe("canTransition — vente directe", () => {
  it("se réactive directement en « Livrée », avec réserve", () => {
    expect(reactivationTarget("DIRECT_SALE")).toBe("DELIVERED");
    const r = canTransition("CANCELLED", "DELIVERED", directSale);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/redevient livrée.*stock/);
  });

  it("réactivée après remboursement, annonce ce qui reste à encaisser", () => {
    const r = canTransition("CANCELLED", "DELIVERED", { ...directSale, paid: E("0.00") });
    expect(reserve(r)).toContain("Il reste 100,00\u202F€ à encaisser.");
  });

  it("refuse CANCELLED → PENDING : réservé aux commandes", () => {
    const r = canTransition("CANCELLED", "PENDING", directSale);
    expect(r.ok).toBe(false);
  });

  it("n'a que deux statuts : ni en attente, ni confirmée", () => {
    for (const [from, to] of [
      ["DELIVERED", "PENDING"],
      ["DELIVERED", "CONFIRMED"],
      ["CANCELLED", "CONFIRMED"],
    ] as const) {
      expect(canTransition(from, to, directSale).ok, `${from} → ${to}`).toBe(false);
    }
  });

  it("s'annule en disant que le stock est restitué", () => {
    const r = canTransition("DELIVERED", "CANCELLED", directSale);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/vente était livrée.*stock est restitué/);
  });
});

describe("canTransition — les seuls refus qui restent", () => {
  it("refuse un statut identique", () => {
    // Ce n'est pas une interdiction : c'est un geste sans effet.
    expect(canTransition("PENDING", "PENDING", order).ok).toBe(false);
    expect(canTransition("DELIVERED", "DELIVERED", order).ok).toBe(false);
  });

  it("une commande ne sort d'« Annulée » que par « Réactiver », vers « En attente »", () => {
    expect(canTransition("CANCELLED", "CONFIRMED", order).ok).toBe(false);
    expect(canTransition("CANCELLED", "DELIVERED", order).ok).toBe(false);
  });

  it("n'oppose aucun refus aux neuf autres combinaisons d'une commande", () => {
    const refused: string[] = [];
    for (const from of DOCUMENT_STATUSES) {
      for (const to of DOCUMENT_STATUSES) {
        if (from === to || from === "CANCELLED") continue;
        if (!canTransition(from, to, order).ok) refused.push(`${from} → ${to}`);
      }
    }
    expect(refused).toEqual([]);
  });
});

describe("assertTransition — la garde du writer", () => {
  it("statut identique : rien à écrire, pas d'erreur (rejeu idempotent)", () => {
    expect(assertTransition("DELIVERED", "DELIVERED", order, { confirmed: false })).toBe(false);
  });

  it("réserve non confirmée : NeedsConfirmation avec le titre de la transition", () => {
    try {
      assertTransition("CONFIRMED", "DELIVERED", { ...order, paid: E("60.00") }, {
        confirmed: false,
        extraReserves: ["Stock de Sauvage à 1 : la fiche passera à 0."],
      });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(NeedsConfirmation);
      const n = e as NeedsConfirmation;
      expect(n.title).toBe("Livrer cette commande ?");
      expect(n.reserves).toEqual([
        "Il reste 40,00\u202F€ à encaisser.",
        "Stock de Sauvage à 1 : la fiche passera à 0.",
      ]);
      expect(n.confirmLabel).toBe("Confirmer");
    }
  });

  it("réserve confirmée : la transition s'applique", () => {
    expect(assertTransition("PENDING", "CONFIRMED", order, { confirmed: true })).toBe(true);
  });

  it("refus : DomainError CONFLICT", () => {
    expect(() => assertTransition("DELIVERED", "PENDING", directSale, { confirmed: true })).toThrow(DomainError);
    try {
      assertTransition("DELIVERED", "PENDING", directSale, { confirmed: true });
    } catch (e) {
      expect((e as DomainError).code).toBe("CONFLICT");
    }
  });
});

describe("naissance, engagement, titres, libellés", () => {
  it("une commande naît confirmée avec un acompte, en attente sans ; une vente directe naît livrée", () => {
    expect(initialStatus("ORDER", E("0.00"))).toBe("PENDING");
    expect(initialStatus("ORDER", E("50.00"))).toBe("CONFIRMED");
    expect(initialStatus("DIRECT_SALE", E("0.00"))).toBe("DELIVERED");
  });

  it("seuls Confirmée et Livrée sont engagés", () => {
    expect(DOCUMENT_STATUSES.filter(isEngaged)).toEqual(["CONFIRMED", "DELIVERED"]);
  });

  it("titres du dialogue selon la transition et l'origine", () => {
    expect(transitionTitle("PENDING", "CONFIRMED", "ORDER")).toBe("Confirmer cette commande ?");
    expect(transitionTitle("CANCELLED", "DELIVERED", "DIRECT_SALE")).toBe("Réactiver cette vente ?");
    expect(transitionTitle("DELIVERED", "CANCELLED", "DIRECT_SALE")).toBe("Annuler cette vente ?");
  });

  it("libellés du lexique : jamais « À traiter »", () => {
    expect(DOCUMENT_STATUSES.map(statusLabel)).toEqual(["En attente", "Confirmée", "Livrée", "Annulée"]);
  });
});

describe("timestampsAfter — cohérence avec les CHECK", () => {
  const t0 = new Date("2026-09-01T10:00:00Z");
  const now = new Date("2026-09-17T10:00:00Z");
  const none = { confirmedAt: null, deliveredAt: null, cancelledAt: null };

  function consistent(status: DocumentStatus, t: ReturnType<typeof timestampsAfter>) {
    expect(t.confirmedAt !== null).toBe(isEngaged(status));
    expect(t.deliveredAt !== null).toBe(status === "DELIVERED");
    expect(t.cancelledAt !== null).toBe(status === "CANCELLED");
  }

  it("respecte les trois CHECK sur toute transition", () => {
    for (const from of DOCUMENT_STATUSES) {
      for (const to of DOCUMENT_STATUSES) {
        const current = {
          confirmedAt: isEngaged(from) ? t0 : null,
          deliveredAt: from === "DELIVERED" ? t0 : null,
          cancelledAt: from === "CANCELLED" ? t0 : null,
        };
        consistent(to, timestampsAfter(from, to, current, now));
      }
    }
  });

  it("Livrée → Confirmée garde la date d'engagement : le coût reste dans sa période", () => {
    const t = timestampsAfter("DELIVERED", "CONFIRMED", { confirmedAt: t0, deliveredAt: t0, cancelledAt: null }, now);
    expect(t.confirmedAt).toBe(t0);
  });

  it("une vente directe réactivée est datée de la réactivation", () => {
    const t = timestampsAfter("CANCELLED", "DELIVERED", { ...none, cancelledAt: t0 }, now);
    expect(t).toEqual({ confirmedAt: now, deliveredAt: now, cancelledAt: null });
  });
});

describe("isOverdue — « En retard » (03 §5.6)", () => {
  // Jeudi 17 septembre 2026, 08:00 à Paris.
  const now = new Date("2026-09-17T06:00:00Z");

  it("en retard dès la veille à Paris, pas le jour même", () => {
    const hier23h = new Date("2026-09-16T21:59:00Z"); // 23:59 Paris
    const aujourdhuiMinuit = new Date("2026-09-16T22:00:00Z"); // 00:00 Paris
    expect(isOverdue({ status: "CONFIRMED", expectedDeliveryAt: hier23h }, now)).toBe(true);
    expect(isOverdue({ status: "PENDING", expectedDeliveryAt: aujourdhuiMinuit }, now)).toBe(false);
  });

  it("ni livré, ni annulé, ni sans date", () => {
    const past = new Date("2026-09-01T00:00:00Z");
    expect(isOverdue({ status: "DELIVERED", expectedDeliveryAt: past }, now)).toBe(false);
    expect(isOverdue({ status: "CANCELLED", expectedDeliveryAt: past }, now)).toBe(false);
    expect(isOverdue({ status: "PENDING", expectedDeliveryAt: null }, now)).toBe(false);
  });
});
