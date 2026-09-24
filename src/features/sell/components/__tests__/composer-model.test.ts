import { describe, expect, it } from "vitest";
import type { ComposerPrefillDTO, RecentlySoldDTO } from "@/contracts/documents";
import type { PocketSummary } from "@/contracts/treasury";
import { eur, formatEur, parseEurInput, type MoneyString } from "@/domain/money";
import { isTextId } from "@/domain/ids";
import {
  applyParams,
  cancelDescription,
  confirmationOf,
  createInput,
  ctaPlan,
  deliveryIso,
  freshDraft,
  fromPocket,
  hasParams,
  isDraftEmpty,
  parseDraft,
  paymentsOf,
  receivedOf,
  receivedText,
  withMode,
  withOffCatalogLine,
  withPerfume,
  withReceived,
  type ComposerDraft,
  type LineSources,
} from "../composer-model";

const m = (value: string) => value as MoneyString;
const euros = (value: string) => formatEur(parseEurInput(value) as NonNullable<ReturnType<typeof parseEurInput>>);

const pocket = (overrides: Partial<PocketSummary>): PocketSummary => ({
  id: "cpocheespeces000000000000",
  name: "Espèces",
  kind: "CASH",
  isSystem: false,
  archived: false,
  sortOrder: 1,
  openingBalance: m("0.00"),
  balance: m("0.00"),
  isDefault: false,
  ...overrides,
});

const CASH = pocket({ isDefault: true });
const BANK = pocket({ id: "cpochebanque0000000000000", name: "Banque", kind: "BANK", sortOrder: 2 });
const SYSTEM = pocket({ id: "cpochenonattribue00000000", name: "Non attribué", kind: "UNASSIGNED", isSystem: true, sortOrder: 0 });
const POCKETS = [CASH, BANK, SYSTEM];
const BATCHES = [{ id: "clotmars00000000000000000", name: "Commande de mars" }];
const ctx = { pockets: POCKETS, batches: BATCHES };

const SAUVAGE = { id: 1, name: "Sauvage", brandName: "Dior", image: "" };
const sources: LineSources = {
  perfumes: [
    {
      ...SAUVAGE,
      status: "PUBLISHED",
      stock: 12,
      stockStatus: "ok",
      searchKey: "sauvage dior",
      pricing: [{ volumeMl: 80, unitPriceEur: m("120.00"), unitCostDzd: "22000.00", exchangeRate: "277.0000", unitCostEur: m("79.42") }],
    },
  ],
  recent: [],
  defaultRate: "277.00",
};

function saleWithSauvage(): ComposerDraft {
  return withPerfume(freshDraft(), SAUVAGE, sources);
}

describe("brouillon du composeur", () => {
  it("un brouillon neuf est vide, en Vente, avec un identifiant de document et dix identifiants de paiement", () => {
    const draft = freshDraft();
    expect(isDraftEmpty(draft)).toBe(true);
    expect(draft.mode).toBe("vente");
    expect(isTextId(draft.id)).toBe(true);
    expect(draft.paymentIds).toHaveLength(10);
    expect(new Set(draft.paymentIds).size).toBe(10);
  });

  it("le mode seul ne rend pas un brouillon non vide ; une ligne ou un nom, si", () => {
    expect(isDraftEmpty(withMode(freshDraft(), "commande"))).toBe(true);
    expect(isDraftEmpty(saleWithSauvage())).toBe(false);
    expect(isDraftEmpty({ ...freshDraft(), customer: { kind: "passing", name: "Fares", contact: "" } })).toBe(false);
  });

  it("relit un brouillon enregistré et refuse une forme inconnue", () => {
    const draft = saleWithSauvage();
    expect(parseDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
    expect(parseDraft({ lignes: 1 })).toBeNull();
    expect(parseDraft({ ...draft, v: 2 })).toBeNull();
    expect(parseDraft({ ...draft, lines: [{ id: "x" }] })).toBeNull();
  });

  it("retaper un parfum ajoute 1 à sa ligne ; la ligne reprend prix, coût et taux de la mémoire (N8)", () => {
    const once = saleWithSauvage();
    expect(once.lines[0]).toMatchObject({ volumeMl: 80, quantity: 1, price: "120", cost: "22000", rate: "277" });
    const twice = withPerfume(once, SAUVAGE, sources);
    expect(twice.lines).toHaveLength(1);
    expect(twice.lines[0]?.quantity).toBe(2);
  });

  it("sans sélecteur lu, la ligne prend le dernier volume et le dernier prix des récents, en attente de sa mémoire", () => {
    const recent: RecentlySoldDTO = { perfumeId: 1, name: "Sauvage", brandName: "Dior", image: "", volumeMl: 50, unitPriceEur: m("85.00"), soldAt: "2026-09-17T10:00:00.000Z" };
    const draft = withPerfume(freshDraft(), SAUVAGE, { perfumes: null, recent: [recent], defaultRate: "277.00" });
    expect(draft.lines[0]).toMatchObject({ volumeMl: 50, price: "85", rate: "277", awaitingPricing: true });
  });

  it("le reçu proposé suit le total en Vente, vaut 0 en Commande ; taper le total revient au proposé", () => {
    const sale = saleWithSauvage();
    expect(receivedText(sale)).toBe("120");
    expect(receivedOf(sale)).toEqual(parseEurInput("120"));
    const partial = withReceived(sale, "50", parseEurInput("50"));
    expect(partial.received).toBe("50");
    expect(withReceived(partial, "120", parseEurInput("120")).received).toBeNull();
    const order = withMode(sale, "commande");
    expect(receivedText(order)).toBe("0");
    expect(eur.isZero(receivedOf(order) as never)).toBe(true);
  });
});

describe("CTA qui dit l'effet complet (06 E11)", () => {
  it("aucune ligne en Vente : pas de CTA", () => {
    expect(ctaPlan(freshDraft(), ctx)).toEqual({ kind: "hidden" });
  });

  it("vente payée : sans nom « Choisir le client » ; nommée, « Encaisser 120,00 € · Espèces », lot en résumé", () => {
    expect(ctaPlan(saleWithSauvage(), ctx)).toEqual({ kind: "customer", label: "Choisir le client", summary: "Chaque vente se range sur une fiche client" });
    const named = { ...saleWithSauvage(), customer: { kind: "passing" as const, name: "Fares", contact: "" } };
    expect(ctaPlan(named, ctx)).toEqual({ kind: "submit", label: `Encaisser ${euros("120")} · Espèces`, summary: "lot Commande de mars" });
  });

  it("vente à crédit partiel sans nom : « Choisir le client », puis « Encaisser 50,00 € » avec ce qui restera", () => {
    const partial = withReceived(saleWithSauvage(), "50", parseEurInput("50"));
    expect(ctaPlan(partial, ctx)).toEqual({ kind: "customer", label: "Choisir le client", summary: `Nécessaire pour suivre les ${euros("70")} à encaisser` });
    const named = { ...partial, customer: { kind: "linked" as const, id: "cclientfares0000000000000", fullName: "Fares Benali", contact: null } };
    expect(ctaPlan(named, ctx)).toEqual({
      kind: "submit",
      label: `Encaisser ${euros("50")} · Espèces`,
      summary: `${euros("70")} resteront à encaisser · lot Commande de mars`,
    });
  });

  it("vente entièrement à crédit : « Enregistrer · 120,00 € à encaisser »", () => {
    const zero = { ...withReceived(saleWithSauvage(), "0", parseEurInput("0")), customer: { kind: "passing" as const, name: "Fares", contact: "" } };
    expect(ctaPlan(zero, ctx)).toMatchObject({ kind: "submit", label: `Enregistrer · ${euros("120")} à encaisser` });
  });

  it("ligne sans prix : « Ajouter le prix · Sauvage 80 ml » ; au-delà du total : « Ramener à »", () => {
    const draft = saleWithSauvage();
    const noPrice = { ...draft, lines: draft.lines.map((line) => ({ ...line, price: "" })) };
    expect(ctaPlan(noPrice, ctx)).toMatchObject({ kind: "line", label: "Ajouter le prix · Sauvage 80 ml", field: "price" });
    const over = { ...draft, received: "500" };
    expect(ctaPlan(over, ctx)).toMatchObject({ kind: "clamp", label: `Ramener à ${euros("120")}` });
  });

  it("commande : le client d'abord, puis un parfum, puis « Créer la commande · acompte 60,00 € »", () => {
    const order = withMode(freshDraft(), "commande");
    expect(ctaPlan(order, ctx)).toMatchObject({ kind: "customer", label: "Choisir le client" });
    const named = { ...order, customer: { kind: "linked" as const, id: "cclientfares0000000000000", fullName: "Fares Benali", contact: null } };
    expect(ctaPlan(named, ctx)).toMatchObject({ kind: "perfume", label: "Ajouter un parfum" });
    const withLine = withPerfume(named, SAUVAGE, sources);
    expect(ctaPlan(withLine, ctx)).toMatchObject({ kind: "submit", label: "Créer la commande", summary: "lot Commande de mars" });
    const deposit = withReceived(withLine, "60", parseEurInput("60"));
    expect(ctaPlan(deposit, ctx)).toEqual({ kind: "submit", label: `Créer la commande · acompte ${euros("60")}`, summary: "Espèces · lot Commande de mars" });
  });
});

describe("entrée de T1", () => {
  it("vente : une ligne catalogue, un paiement dans la poche proposée, identifiants du brouillon", () => {
    const draft = saleWithSauvage();
    const input = createInput(draft, ctx);
    expect(input).toMatchObject({
      id: draft.id,
      origin: "DIRECT_SALE",
      customer: { kind: "passing", name: null, contact: null },
      batchId: BATCHES[0]?.id,
      lines: [{ item: { kind: "catalogue", perfumeId: 1 }, volumeMl: 80, quantity: 1, unitPriceEur: "120", isGift: false, unitCostDzd: "22000", exchangeRate: "277" }],
      payments: [{ id: draft.paymentIds[0], amount: "120.00", pocketId: CASH.id }],
    });
    expect(input.expectedDeliveryAt).toBeUndefined();
  });

  it("client : la fiche choisie, sinon le nom tapé (fiche reprise ou créée) ; une lettre seule reste de passage", () => {
    const withCustomer = (customer: ComposerDraft["customer"]) => createInput({ ...saleWithSauvage(), customer }, ctx).customer;
    expect(withCustomer({ kind: "linked", id: "cclientfares0000000000000", fullName: "Fares", contact: null })).toEqual({ kind: "linked", customerId: "cclientfares0000000000000" });
    expect(withCustomer({ kind: "passing", name: "  Lina Haddad ", contact: "" })).toEqual({ kind: "named", name: "Lina Haddad" });
    expect(withCustomer({ kind: "passing", name: "L", contact: "" })).toEqual({ kind: "passing", name: "L", contact: null });
  });

  it("répartition S08 : les parts saisies, le reste à « Non attribué » ; ignorée si le reçu a changé", () => {
    const draft = { ...saleWithSauvage(), split: { received: m("120.00"), entries: [{ pocketId: CASH.id, amount: "100" }] } };
    expect(paymentsOf(draft, POCKETS).map((part) => [part.pocketName, part.amount])).toEqual([
      ["Espèces", parseEurInput("100")],
      ["Non attribué", parseEurInput("20")],
    ]);
    const changed = { ...draft, received: "110" };
    expect(paymentsOf(changed, POCKETS)).toHaveLength(1);
  });

  it("commande hors catalogue : livraison au jour de Paris, notes, sans paiement", () => {
    const order = {
      ...withOffCatalogLine(withMode(freshDraft(), "commande"), "Khamrah", "Lattafa", "277.00"),
      customer: { kind: "passing" as const, name: "Fares", contact: "06" },
      deliveryDay: "2026-09-18",
      notes: "Coffret",
    };
    const input = createInput({ ...order, lines: order.lines.map((line) => ({ ...line, price: "45" })) }, ctx);
    expect(input).toMatchObject({
      origin: "ORDER",
      customer: { kind: "named", name: "Fares" },
      expectedDeliveryAt: "2026-09-17T22:00:00.000Z",
      expectedDeliveryHasTime: false,
      notes: "Coffret",
      lines: [{ item: { kind: "offCatalog", name: "Khamrah", brandName: "Lattafa" }, unitPriceEur: "45" }],
      payments: [],
    });
    expect(deliveryIso("2026-09-18", "14:30")).toBe("2026-09-18T12:30:00.000Z");
  });
});

describe("carte de confirmation", () => {
  it("« Vente enregistrée · 120,00 € · Espèces » et la description vraie de l'annulation", () => {
    const draft = saleWithSauvage();
    const card = confirmationOf(draft, { id: draft.id, origin: "DIRECT_SALE", status: "DELIVERED", total: m("120.00"), paid: m("120.00"), due: m("0.00") }, ctx);
    expect(card.title).toBe(`Vente enregistrée · ${euros("120")} · Espèces`);
    expect(cancelDescription(card)).toBe(`Le document reste consultable, marqué annulé. Les ${euros("120")} sont retirés d'Espèces aujourd'hui. Le stock est restitué.`);
    expect(fromPocket("Banque")).toBe("de Banque");
  });

  it("commande : client, livraison et acompte", () => {
    const now = new Date("2026-09-17T08:00:00.000Z");
    const order = {
      ...withReceived(withPerfume(withMode(freshDraft(), "commande"), SAUVAGE, sources), "60", parseEurInput("60")),
      customer: { kind: "linked" as const, id: "cclientfares0000000000000", fullName: "Fares", contact: null },
      deliveryDay: "2026-09-18",
    };
    const card = confirmationOf(order, { id: order.id, origin: "ORDER", status: "CONFIRMED", total: m("120.00"), paid: m("60.00"), due: m("60.00") }, ctx, now);
    expect(card.title).toMatch(/^Commande de Fares · livraison .+ · acompte 60,00/);
  });
});

describe("paramètres d'URL", () => {
  const prefill = (overrides: Partial<ComposerPrefillDTO>): ComposerPrefillDTO => ({ customer: null, perfume: null, source: null, ...overrides });

  it("sans paramètre, rien à consommer", () => {
    expect(hasParams({ mode: null, prefill: null })).toBe(false);
    expect(hasParams({ mode: null, prefill: prefill({}) })).toBe(false);
    expect(hasParams({ mode: "commande", prefill: null })).toBe(true);
  });

  it("« Refaire » reprend lignes, client et lot ouvert, et le mode de l'origine — jamais paiements ni livraison", () => {
    const draft = applyParams(
      freshDraft(),
      {
        mode: null,
        prefill: prefill({
          source: {
            id: "e2e0d0c0-0000-4000-8000-000000000002",
            origin: "ORDER",
            customer: { id: "cclientfares0000000000000", fullName: "Fares Benali", contact: "06 12 34 56 78" },
            customerName: "Fares Benali",
            customerContact: null,
            batch: { id: "clotmars00000000000000000", name: "Commande de mars" },
            lines: [
              { perfumeId: 1, perfumeName: "Sauvage", brandName: "Dior", imageUrl: null, volumeMl: 80, quantity: 2, unitPriceEur: m("120.00"), isGift: false, unitCostDzd: "22000.00", exchangeRate: "277.0000" },
              { perfumeId: null, perfumeName: "Khamrah", brandName: "Lattafa", imageUrl: null, volumeMl: 50, quantity: 1, unitPriceEur: m("45.00"), isGift: false, unitCostDzd: null, exchangeRate: null },
            ],
          },
        }),
      },
      sources,
    );
    expect(draft.mode).toBe("commande");
    expect(draft.customer).toMatchObject({ kind: "linked", fullName: "Fares Benali" });
    expect(draft.batch).toEqual({ kind: "chosen", id: "clotmars00000000000000000", name: "Commande de mars" });
    expect(draft.lines.map((line) => [line.perfumeName, line.isOffCatalog, line.quantity, line.price, line.cost])).toEqual([
      ["Sauvage", false, 2, "120", "22000"],
      ["Khamrah", true, 1, "45", ""],
    ]);
    expect(draft.received).toBeNull();
    expect(draft.deliveryDay).toBeNull();
  });

  it("`client` pose la fiche, `parfum` ajoute la ligne, `mode` l'emporte", () => {
    const draft = applyParams(
      freshDraft(),
      { mode: "commande", prefill: prefill({ customer: { id: "cclientlina00000000000000", fullName: "Lina Haddad", contact: null }, perfume: SAUVAGE }) },
      sources,
    );
    expect(draft.mode).toBe("commande");
    expect(draft.customer).toMatchObject({ kind: "linked", fullName: "Lina Haddad" });
    expect(draft.lines.map((line) => line.perfumeName)).toEqual(["Sauvage"]);
  });
});
