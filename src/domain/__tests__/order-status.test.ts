import { describe, expect, it } from "vitest";
import {
  DELIVERED_VISIBILITY_HOURS,
  canTransition,
  deliveredAtFor,
  deliveredVisibilitySince,
  deriveFulfillment,
  remainingToDeliver,
  type TransitionContext,
} from "../order-status";

const base: TransitionContext = {
  depositPaidTotal: 0,
  balancePaidTotal: 0,
  orderTotal: 100,
  hasSale: false,
};

/** Raccourci de lecture : la réserve attachée à un verdict favorable. */
function reserve(r: ReturnType<typeof canTransition>): string | undefined {
  return r.ok ? r.confirm : undefined;
}

/*
 * Ces tests décrivent un RENVERSEMENT de comportement, pas une correction.
 *
 * La version précédente refusait quatre transitions : passer en « à traiter »
 * sans acompte, livrer avec un solde dû, revenir en arrière avec des acomptes
 * enregistrés, dé-livrer une commande ayant une vente. Chacune décrivait le cas
 * courant, aucune ne décrivait la réalité — une commande offerte vaut 0 €, un
 * client de confiance emporte son flacon avant de payer, un clic se corrige.
 *
 * Ces refus deviennent des réserves à confirmer. Ce qui suit vérifie donc que
 * `ok` est VRAI là où il était faux, et surtout qu'une réserve accompagne bien
 * chacun de ces cas : autoriser sans prévenir serait l'excès inverse.
 */
describe("canTransition — plus aucun mur, des réserves", () => {
  it("passe en « à traiter » sans acompte, en le signalant", () => {
    // Le cas rapporté : une commande offerte, total 0 €, aucun acompte.
    const r = canTransition("PENDING", "READY", { ...base, orderTotal: 0 });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/aucun acompte/i);
  });

  it("laisse sauter directement de « en attente » à « livrée »", () => {
    // L'écran affiche les trois statuts côte à côte : la case du milieu ne peut
    // pas être un péage.
    const r = canTransition("PENDING", "DELIVERED", base);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/directement/i);
  });

  it("livre avec un solde dû, en annonçant le montant exact", () => {
    const r = canTransition("READY", "DELIVERED", {
      ...base,
      depositPaidTotal: 50,
      balancePaidTotal: 49,
    });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toContain("1,00 €");
  });

  it("revient en arrière malgré des acomptes, en disant qu'ils restent en compta", () => {
    const r = canTransition("READY", "PENDING", { ...base, depositPaidTotal: 30 });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/30,00 €.*comptabilité/i);
  });

  it("dé-livre une commande ayant une vente, en prévenant qu'elle y reste", () => {
    const r = canTransition("DELIVERED", "READY", { ...base, hasSale: true });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/vente est rattachée/i);
  });

  it("sort une commande de l'annulation", () => {
    // L'ancienne version en faisait un cul-de-sac : corriger un clic obligeait
    // à recréer la commande.
    for (const cible of ["PENDING", "READY", "DELIVERED"] as const) {
      const r = canTransition("CANCELLED", cible, base);
      expect(r.ok).toBe(true);
      expect(reserve(r)).toMatch(/annulée/i);
    }
  });

  it("signale une livraison sans aucun article", () => {
    const r = canTransition("READY", "DELIVERED", {
      ...base,
      orderTotal: 0,
      itemCount: 0,
    });
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/aucun article/i);
  });
});

describe("canTransition — ce qui passe sans rien demander", () => {
  /*
   * L'absence de réserve n'est pas un détail de confort : `paymentActions`
   * s'en sert pour décider si la transition automatique PENDING → READY peut
   * se déclencher. Une réserve qui apparaîtrait ici la ferait taire, et
   * enregistrer un acompte cesserait de faire avancer la commande.
   */
  it("passe en « à traiter » sans un mot quand l'acompte est là", () => {
    const r = canTransition("PENDING", "READY", { ...base, depositPaidTotal: 10 });
    expect(r).toEqual({ ok: true });
  });

  it("livre sans un mot quand tout est encaissé", () => {
    const r = canTransition("READY", "DELIVERED", {
      ...base,
      depositPaidTotal: 50,
      balancePaidTotal: 50,
    });
    expect(r).toEqual({ ok: true });
  });

  it("revient en arrière sans un mot quand aucun acompte n'est enregistré", () => {
    expect(canTransition("READY", "PENDING", base)).toEqual({ ok: true });
  });

  it("annule sans un mot depuis les statuts en cours", () => {
    expect(canTransition("PENDING", "CANCELLED", base)).toEqual({ ok: true });
    expect(canTransition("READY", "CANCELLED", base)).toEqual({ ok: true });
  });

  it("annule une commande livrée en le signalant", () => {
    const r = canTransition("DELIVERED", "CANCELLED", base);
    expect(r.ok).toBe(true);
    expect(reserve(r)).toMatch(/livrée/i);
  });
});

describe("canTransition — le seul refus qui reste", () => {
  it("refuse un statut identique", () => {
    // Ce n'est pas une interdiction : c'est un geste sans effet.
    expect(canTransition("PENDING", "PENDING", base).ok).toBe(false);
    expect(canTransition("DELIVERED", "DELIVERED", base).ok).toBe(false);
  });

  it("n'oppose aucun refus aux douze autres combinaisons", () => {
    const statuts = ["PENDING", "READY", "DELIVERED", "CANCELLED"] as const;
    const refuses: string[] = [];
    for (const from of statuts) {
      for (const to of statuts) {
        if (from === to) continue;
        if (!canTransition(from, to, base).ok) refuses.push(`${from} → ${to}`);
      }
    }
    expect(refuses).toEqual([]);
  });
});

describe("deriveFulfillment", () => {
  it("none when nothing delivered", () => {
    expect(deriveFulfillment([{ quantity: 2, deliveredQuantity: 0 }])).toBe("none");
  });

  it("partial when some but not all delivered", () => {
    expect(deriveFulfillment([{ quantity: 2, deliveredQuantity: 1 }])).toBe("partial");
    expect(
      deriveFulfillment([
        { quantity: 1, deliveredQuantity: 1 },
        { quantity: 1, deliveredQuantity: 0 },
      ]),
    ).toBe("partial");
  });

  it("full when every line fully delivered", () => {
    expect(
      deriveFulfillment([
        { quantity: 2, deliveredQuantity: 2 },
        { quantity: 1, deliveredQuantity: 1 },
      ]),
    ).toBe("full");
  });

  it("clamps over-delivery to full", () => {
    expect(deriveFulfillment([{ quantity: 1, deliveredQuantity: 5 }])).toBe("full");
  });

  it("empty order is none", () => {
    expect(deriveFulfillment([])).toBe("none");
  });
});

describe("remainingToDeliver", () => {
  it("counts lines not fully delivered", () => {
    expect(
      remainingToDeliver([
        { quantity: 2, deliveredQuantity: 2 },
        { quantity: 2, deliveredQuantity: 1 },
        { quantity: 1, deliveredQuantity: 0 },
      ]),
    ).toBe(2);
  });
});

describe("horodatage de livraison", () => {
  it("date la livraison, et seulement elle", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(deliveredAtFor("DELIVERED", now)).toBe(now);
    expect(deliveredAtFor("READY", now)).toBeNull();
    expect(deliveredAtFor("PENDING", now)).toBeNull();
  });

  it("efface la date quand la commande n'est plus livrée", () => {
    // Revenir en arrière ne doit pas laisser la trace d'une livraison annulée :
    // la commande resterait dans la fenêtre des livrées en affichant « à traiter ».
    expect(deliveredAtFor("READY")).toBeNull();
  });
});

describe("fenêtre de visibilité des livrées", () => {
  it("remonte exactement de la durée annoncée", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const since = deliveredVisibilitySince(now);
    const heures = (now.getTime() - since.getTime()) / 3600 / 1000;
    expect(heures).toBe(DELIVERED_VISIBILITY_HOURS);
  });

  it("dure 48 h — la valeur que l'écran annonce à l'utilisateur", () => {
    expect(DELIVERED_VISIBILITY_HOURS).toBe(48);
  });

  it("une commande livrée à l'instant est dans la fenêtre, une d'il y a trois jours non", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const since = deliveredVisibilitySince(now);
    const toutJuste = new Date(now.getTime() - 3600 * 1000);
    const troisJours = new Date(now.getTime() - 72 * 3600 * 1000);
    expect(toutJuste >= since).toBe(true);
    expect(troisJours >= since).toBe(false);
  });
});
