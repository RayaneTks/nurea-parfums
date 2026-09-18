import { describe, expect, it } from "vitest";
import type { DashboardFiguresDTO } from "@/contracts/chiffres";
import type { DayRecapDTO, TodayDTO } from "@/contracts/stats";
import { eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import {
  alertRows,
  barWidth,
  customerLabel,
  dayDocumentCaption,
  hasToday,
  maxUnits,
  pipelineTiles,
  plural,
  shareRecapText,
  todayCaption,
  unitsLabel,
  unitsSubtitle,
} from "../home-model";

const m = (value: string) => value as MoneyString;

/** « 120,50 € » tel que `formatEur` l'écrit (espace fine insécable) : le test ne recopie pas le format. */
const euros = (value: string, compact = false) => formatEur(eurFromWire(m(value)), { compact });

const MARGE = {
  value: m("1240.00"),
  percent: "38,5",
  encaisse: m("3220.00"),
  costs: m("1800.00"),
  expenses: m("180.00"),
  hasUnknownCost: false,
  unknownCostCount: 0,
};

/** Un Accueil où tout va bien : aucun retard, rien à relancer, aucune alerte de stock. */
const CALME: DashboardFiguresDTO = {
  month: { from: "2026-08-31T22:00:00.000Z", to: "2026-09-30T22:00:00.000Z" },
  encaisseMois: m("3220.00"),
  encaisseJour: m("240.00"),
  margeNetteMois: MARGE,
  aEncaisser: m("0.00"),
  tresorerie: { total: m("1546.00"), unassigned: m("0.00") },
  enRetard: 0,
  clientsARelancer: 0,
  coutACompleter: 0,
  commandes: { enAttente: 0, confirmees: 0 },
  stock: { threshold: 3, out: { count: 0, perfumeIds: [] }, low: { count: 0, perfumeIds: [] } },
};

describe("« À faire » : rien à faire ⇒ rien rendu (05 §5.3)", () => {
  it("aucune rangée quand tout va bien — le bloc n'existe pas", () => {
    expect(alertRows(CALME)).toEqual([]);
  });

  it("une rangée par chose à faire, dans l'ordre d'urgence de 06 E01", () => {
    const rows = alertRows({
      ...CALME,
      enRetard: 3,
      tresorerie: { total: m("1546.00"), unassigned: m("120.00") },
      clientsARelancer: 2,
      coutACompleter: 1,
      stock: { threshold: 3, out: { count: 1, perfumeIds: [4] }, low: { count: 3, perfumeIds: [2, 6, 10] } },
    });
    expect(rows.map((row) => [row.kind, row.label])).toEqual([
      ["retard", "3 commandes en retard"],
      ["non-attribue", `${euros("120.00", true)} non attribués`],
      ["a-relancer", "2 clients à relancer · plus de 30 j"],
      ["cout-a-completer", "1 document au coût à compléter"],
      ["rupture", "1 parfum en rupture"],
      ["stock-bas", "3 parfums en stock bas"],
    ]);
  });

  it("rupture et stock bas restent DEUX rangées : chacune ouvre exactement ce qu'elle compte", () => {
    const rows = alertRows({
      ...CALME,
      stock: { threshold: 3, out: { count: 2, perfumeIds: [4, 20] }, low: { count: 0, perfumeIds: [] } },
    });
    expect(rows.map((row) => row.kind)).toEqual(["rupture"]);
    expect(rows[0]?.count).toBe(2);
  });

  it("« Répartir » agit sur place et porte son montant, pas un compte", () => {
    const [row] = alertRows({ ...CALME, tresorerie: { total: m("1546.00"), unassigned: m("120.50") } });
    expect(row).toMatchObject({ kind: "non-attribue", actsInPlace: true, count: null, amount: "120.50" });
    expect(row?.label).toBe(`${euros("120.50", true)} non attribués`);
  });

  it("un chiffre de retard au singulier n'écrit pas « 1 commandes »", () => {
    expect(alertRows({ ...CALME, enRetard: 1 })[0]?.label).toBe("1 commande en retard");
    expect(plural(0, "vente")).toBe("0 vente");
    expect(plural(2, "commande")).toBe("2 commandes");
  });
});

describe("bloc « Aujourd'hui » (06 E01 zone 4)", () => {
  const JOUR: TodayDTO = {
    jour: "2026-09-17",
    encaisse: m("240.00"),
    ventes: 3,
    commandesPrises: 1,
    aLivrerAujourdhui: 2,
    aLivrerDemain: 3,
  };

  it("légende : « 3 ventes · 1 commande prise », parts nulles omises", () => {
    expect(todayCaption(JOUR)).toBe("3 ventes · 1 commande prise");
    expect(todayCaption({ ventes: 0, commandesPrises: 2 })).toBe("2 commandes prises");
    expect(todayCaption({ ventes: 1, commandesPrises: 0 })).toBe("1 vente");
    expect(todayCaption({ ventes: 0, commandesPrises: 0 })).toBeNull();
  });

  // `hasToday` décide du CONTENU de la carte, pas de son existence : la carte reste, seule porte vers E02
  // (amendement J14-10) ; sur une journée sans rien, elle dit « Rien encore aujourd'hui. » au lieu d'un 0 €.
  it("une journée vide n'a rien à chiffrer ; un encaissement seul suffit à en avoir", () => {
    const vide: TodayDTO = { ...JOUR, encaisse: m("0.00"), ventes: 0, commandesPrises: 0, aLivrerAujourdhui: 0, aLivrerDemain: 0 };
    expect(hasToday(vide)).toBe(false);
    expect(hasToday({ ...vide, encaisse: m("40.00") })).toBe(true);
    expect(hasToday({ ...vide, aLivrerDemain: 1 })).toBe(true);
  });
});

describe("pipeline des commandes (06 E01 zone 6)", () => {
  it("une tuile à 0 disparaît ; les deux à 0 ⇒ aucun bloc", () => {
    expect(pipelineTiles({ enAttente: 2, confirmees: 5 }).map((t) => t.kind)).toEqual(["en-attente", "confirmees"]);
    expect(pipelineTiles({ enAttente: 0, confirmees: 5 }).map((t) => t.kind)).toEqual(["confirmees"]);
    expect(pipelineTiles({ enAttente: 0, confirmees: 0 })).toEqual([]);
  });
});

describe("classement en unités (06 E07)", () => {
  it("compte des flacons, jamais un montant", () => {
    expect(unitsLabel(12)).toBe("12 flacons");
    expect(unitsLabel(1)).toBe("1 flacon");
    expect(unitsSubtitle(84, "septembre")).toBe("84 flacons vendus · septembre");
    expect(unitsSubtitle(1, "septembre")).toBe("1 flacon vendu · septembre");
  });

  it("la barre compare les lignes entre elles ; jamais invisible", () => {
    expect(barWidth(12, 12)).toBe(100);
    expect(barWidth(6, 12)).toBe(50);
    expect(barWidth(1, 200)).toBe(2);
    expect(barWidth(5, 0)).toBe(0);
    expect(maxUnits([{ units: 3 }, { units: 12 }, { units: 7 }])).toBe(12);
    expect(maxUnits([])).toBe(0);
  });
});

describe("récap du jour (06 E02)", () => {
  const RECAP: DayRecapDTO = {
    jour: "2026-09-17",
    isToday: true,
    previousDay: "2026-09-16",
    nextDay: null,
    encaisse: m("240.00"),
    parPoche: [
      { pocketId: "p1", name: "Espèces", isSystem: false, encaisse: m("180.00") },
      { pocketId: "p2", name: "Banque", isSystem: false, encaisse: m("60.00") },
      { pocketId: "p0", name: "Non attribué", isSystem: true, encaisse: m("0.00") },
    ],
    documents: [
      { documentId: "d1", origin: "DIRECT_SALE", status: "DELIVERED", kind: "vente", customerName: "Nora Belkacem", itemCount: 2, total: m("120.00"), due: m("0.00"), at: "2026-09-17T10:00:00.000Z" },
      { documentId: "d2", origin: "ORDER", status: "PENDING", kind: "commande-prise", customerName: null, itemCount: 1, total: m("95.00"), due: m("95.00"), at: "2026-09-17T12:00:00.000Z" },
    ],
    demain: [
      { documentId: "d3", status: "CONFIRMED", customerName: "Fares Benali", total: m("80.00"), due: m("80.00"), expectedDeliveryAt: "2026-09-18T14:00:00.000Z", hasTime: true },
    ],
    isEmpty: false,
  };

  it("légende d'une ligne : le fait le plus avancé du document", () => {
    expect(dayDocumentCaption("vente", 2)).toBe("Vente · 2 articles");
    expect(dayDocumentCaption("vente", 1)).toBe("Vente · 1 article");
    expect(dayDocumentCaption("commande-prise", 3)).toBe("Commande prise");
    expect(dayDocumentCaption("commande-livree", 3)).toBe("Commande livrée");
  });

  it("un client de passage sans nom est nommé comme partout ailleurs (06 §1.7)", () => {
    expect(customerLabel(null)).toBe("Client de passage");
    expect(customerLabel("Nora Belkacem")).toBe("Nora Belkacem");
  });

  it("le texte partagé dit la vérité, et omet toute section vide", () => {
    const texte = shareRecapText({
      dateLabel: "jeudi 17 septembre",
      recap: RECAP,
      relances: { clients: 2, total: m("160.00") },
    });
    expect(texte.split("\n")).toEqual([
      "Récap du jeudi 17 septembre",
      `Encaissé : ${euros("240.00")}`,
      `· Espèces : ${euros("180.00")}`,
      `· Banque : ${euros("60.00")}`,
      "1 vente · 1 commande prise",
      "À livrer demain : Fares Benali",
      `À relancer : 2 clients · ${euros("160.00")}`,
    ]);
  });

  it("une journée sans rien ne partage que sa date et son Encaissé à 0", () => {
    const vide: DayRecapDTO = { ...RECAP, encaisse: m("0.00"), parPoche: [], documents: [], demain: [], isEmpty: true };
    expect(shareRecapText({ dateLabel: "lundi 14 septembre", recap: vide, relances: { clients: 0, total: m("0.00") } }).split("\n")).toEqual([
      "Récap du lundi 14 septembre",
      `Encaissé : ${euros("0.00")}`,
    ]);
  });

  it("une commande livrée du jour se compte comme livrée, pas comme prise", () => {
    const recap: DayRecapDTO = {
      ...RECAP,
      parPoche: [],
      demain: [],
      documents: [{ ...(RECAP.documents[1] as DayRecapDTO["documents"][number]), kind: "commande-livree" }],
    };
    expect(shareRecapText({ dateLabel: "j", recap, relances: { clients: 0, total: m("0.00") } })).toContain("1 commande livrée");
  });
});
