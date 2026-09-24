import { describe, expect, it } from "vitest";
import { fieldMessages } from "../zod-fr";
import {
  cancelDocumentInput,
  deliverAndCollectInput,
  revertDocumentChangeInput,
  DIRECT_SALE_DELIVERY_MESSAGE,
  ITEM_REQUIRED_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
  PROPOSED_VOLUME_ML,
  RATE_REQUIRED_MESSAGE,
  SALE_NAME_REQUIRED_MESSAGE,
  VOLUME_MESSAGE,
  assignDocumentsToBatchInput,
  changeDocumentStatusInput,
  createDocumentInput,
  customerNameRequirement,
  setLineDeliveredInput,
  updateDocumentInput,
} from "../documents";
import { eurFromWire, type MoneyString } from "@/domain/money";

const ID = "5b0f3a1e-2c4d-4e6f-8a9b-0c1d2e3f4a5b";
const LINE_ID = "7c1e2d3f-4a5b-4c6d-9e8f-1a2b3c4d5e6f";

const line = (overrides: Record<string, unknown> = {}) => ({
  item: { kind: "catalogue", perfumeId: 12 },
  volumeMl: 80,
  quantity: 1,
  unitPriceEur: "120",
  ...overrides,
});

/** Saisie brute, volontairement non typée : le contrat est éprouvé sur ce que l'écran peut envoyer. */
const order = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: ID,
  origin: "ORDER",
  customer: { kind: "passing", name: "Fares" },
  lines: [line()],
  ...overrides,
});

function errors(result: { success: boolean; error?: import("zod").ZodError }) {
  return result.success ? {} : fieldMessages(result.error as import("zod").ZodError);
}

describe("createDocumentInput — lignes", () => {
  it("normalise les montants saisis au clavier en chaînes exactes", () => {
    const parsed = createDocumentInput.parse(
      order({ lines: [line({ unitPriceEur: "119,9", unitCostDzd: "30 000", exchangeRate: "277", note: "  cadeau  " })] }),
    );
    expect(parsed.lines[0]).toMatchObject({
      unitPriceEur: "119.90",
      unitCostDzd: "30000.00",
      exchangeRate: "277.00",
      isGift: false,
      note: "cadeau",
    });
    expect(parsed.confirm).toBe(false);
  });

  it("ligne offerte : prix vide ou 0 → 0,00 ; prix non nul → VALIDATION sous le prix", () => {
    expect(createDocumentInput.parse(order({ lines: [line({ isGift: true, unitPriceEur: "" })] })).lines[0]?.unitPriceEur).toBe(
      "0.00",
    );
    expect(createDocumentInput.parse(order({ lines: [line({ isGift: true, unitPriceEur: "0" })] })).lines[0]?.unitPriceEur).toBe(
      "0.00",
    );
    const refused = createDocumentInput.safeParse(order({ lines: [line({ isGift: true, unitPriceEur: "10" })] }));
    expect(errors(refused)).toEqual({ "lines.0.unitPriceEur": "Mets le prix de la ligne offerte à 0 € ou décoche Offert." });
  });

  it("ligne non offerte sans prix, ou à 0 € : « Indique un prix pour cette ligne, ou coche Offert. »", () => {
    for (const unitPriceEur of [undefined, "", "0"]) {
      const refused = createDocumentInput.safeParse(order({ lines: [line({ unitPriceEur })] }));
      expect(errors(refused)).toEqual({ "lines.0.unitPriceEur": PRICE_REQUIRED_MESSAGE });
    }
  });

  it("coût sans taux, taux nul, montants illisibles", () => {
    expect(errors(createDocumentInput.safeParse(order({ lines: [line({ unitCostDzd: "9000" })] })))).toEqual({
      "lines.0.exchangeRate": RATE_REQUIRED_MESSAGE,
    });
    expect(errors(createDocumentInput.safeParse(order({ lines: [line({ unitCostDzd: "9000", exchangeRate: "0" })] })))).toEqual({
      "lines.0.exchangeRate": "Saisis un taux supérieur à 0 (ex. 277).",
    });
    expect(errors(createDocumentInput.safeParse(order({ lines: [line({ unitPriceEur: "12,345" })] })))).toEqual({
      "lines.0.unitPriceEur": "Saisis un prix en euros (ex. 120 ou 119,90).",
    });
  });

  it("taux seul accepté (coût à compléter)", () => {
    const parsed = createDocumentInput.parse(order({ lines: [line({ exchangeRate: "277,5" })] }));
    expect(parsed.lines[0]).toMatchObject({ unitCostDzd: null, exchangeRate: "277.50" });
  });

  it("volume hors 10/50/80 (anciennes contenances 30 et 100 comprises), quantité nulle, parfum absent", () => {
    for (const volumeMl of [30, 75, 100, null]) {
      const refused = createDocumentInput.safeParse(order({ lines: [line({ volumeMl, quantity: 0, item: undefined })] }));
      expect(errors(refused)).toEqual({
        "lines.0.volumeMl": VOLUME_MESSAGE,
        "lines.0.quantity": "Indique une quantité d'au moins 1.",
        "lines.0.item": ITEM_REQUIRED_MESSAGE,
      });
    }
  });

  it("contenances 10, 50 et 80 ml ; 80 ml est proposé par l'écran, jamais posé en silence", () => {
    for (const volumeMl of [10, 50, 80]) {
      expect(createDocumentInput.parse(order({ lines: [line({ volumeMl })] })).lines[0]?.volumeMl).toBe(volumeMl);
    }
    expect(PROPOSED_VOLUME_ML).toBe(80);
    expect(errors(createDocumentInput.safeParse(order({ lines: [line({ volumeMl: undefined })] })))).toEqual({
      "lines.0.volumeMl": VOLUME_MESSAGE,
    });
    expect(
      errors(updateDocumentInput.safeParse({ documentId: ID, lines: [{ id: LINE_ID, quantity: 1, unitPriceEur: "1" }] })),
    ).toEqual({ "lines.0.volumeMl": VOLUME_MESSAGE });
  });

  it("hors catalogue : nom exigé, marque facultative", () => {
    const parsed = createDocumentInput.parse(
      order({ lines: [line({ item: { kind: "offCatalog", name: "  Khamrah ", brandName: "" } })] }),
    );
    expect(parsed.lines[0]?.item).toEqual({ kind: "offCatalog", name: "Khamrah", brandName: null });
    expect(errors(createDocumentInput.safeParse(order({ lines: [line({ item: { kind: "offCatalog", name: "K" } })] })))).toEqual({
      "lines.0.item.name": "Indique le nom du parfum (2 caractères au moins).",
    });
  });

  it("au moins un article", () => {
    expect(errors(createDocumentInput.safeParse(order({ lines: [] })))).toEqual({ lines: "Ajoute au moins un article." });
  });
});

describe("createDocumentInput — client et livraison", () => {
  it("une commande exige un nom ; une fiche liée ou créée en ligne en porte un", () => {
    expect(errors(createDocumentInput.safeParse(order({ customer: { kind: "passing", name: " " } })))).toEqual({
      customer: "Choisis le client : une commande se suit sous un nom.",
    });
    expect(errors(createDocumentInput.safeParse(order({ customer: undefined })))).toEqual({
      customer: "Choisis le client : une commande se suit sous un nom.",
    });
    expect(createDocumentInput.safeParse(order({ customer: { kind: "linked", customerId: ID } })).success).toBe(true);
    expect(
      createDocumentInput.safeParse(order({ customer: { kind: "new", customer: { fullName: "Lina", phone: "06 12 34 56 78" } } }))
        .success,
    ).toBe(true);
  });

  it("vente directe : nom exigé s'il reste à encaisser, pas pour un don à 0 €", () => {
    const sale = { origin: "DIRECT_SALE", customer: { kind: "passing", name: null } };
    expect(errors(createDocumentInput.safeParse(order({ ...sale })))).toEqual({
      customer: "Choisis le client : il faut un nom pour suivre les 120,00 € à encaisser.",
    });
    // Nom exigé toujours (amendé le 24/09/2026), même pour un don à 0 € : chaque vente se range sur une fiche.
    expect(errors(createDocumentInput.safeParse(order({ ...sale, lines: [line({ isGift: true, unitPriceEur: null })] })))).toEqual({
      customer: SALE_NAME_REQUIRED_MESSAGE,
    });
    expect(createDocumentInput.safeParse(order({ ...sale, customer: { kind: "named", name: "Fares" } })).success).toBe(true);
  });

  it("customerNameRequirement : rien pour une vente soldée", () => {
    expect(customerNameRequirement("DIRECT_SALE", eurFromWire("0.00" as MoneyString))).toBeNull();
  });

  it("livraison prévue : acceptée sur une commande, refusée sur une vente directe", () => {
    const parsed = createDocumentInput.parse(order({ expectedDeliveryAt: "2026-09-18", expectedDeliveryHasTime: false }));
    expect(parsed.expectedDeliveryAt).toEqual(new Date("2026-09-18"));
    expect(
      errors(
        createDocumentInput.safeParse(
          order({ origin: "DIRECT_SALE", customer: { kind: "passing", name: "Fares" }, expectedDeliveryAt: "2026-09-18" }),
        ),
      ),
    ).toEqual({ expectedDeliveryAt: DIRECT_SALE_DELIVERY_MESSAGE });
    expect(errors(createDocumentInput.safeParse(order({ expectedDeliveryAt: "demain" })))).toEqual({
      expectedDeliveryAt: "Choisis une date valide.",
    });
  });

  it("identifiant de document : UUID ou cuid, jamais une valeur fabriquée", () => {
    expect(createDocumentInput.safeParse(order({ id: "cm0abcdefghijklmnopqrstuv" })).success).toBe(true);
    expect(errors(createDocumentInput.safeParse(order({ id: "d-1" })))).toEqual({
      id: "Cet élément n'est plus reconnu : recharge la page et réessaie.",
    });
  });
});

describe("updateDocumentInput", () => {
  it("chaque ligne porte son identifiant ; une ligne existante peut omettre son parfum", () => {
    const parsed = updateDocumentInput.parse({
      documentId: ID,
      lines: [{ id: LINE_ID, volumeMl: 50, quantity: 2, unitPriceEur: "80" }],
    });
    expect(parsed.lines?.[0]).toMatchObject({ id: LINE_ID, unitPriceEur: "80.00" });
    expect(parsed.lines?.[0]?.item).toBeUndefined();
    expect(parsed.customer).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it("une note vidée est effacée, absente elle n'est pas touchée", () => {
    expect(updateDocumentInput.parse({ documentId: ID, notes: "" }).notes).toBeNull();
    expect(updateDocumentInput.parse({ documentId: ID }).notes).toBeUndefined();
  });

  it("refuse une ligne sans identifiant, deux fois la même ligne, et une liste vide", () => {
    expect(
      errors(updateDocumentInput.safeParse({ documentId: ID, lines: [{ volumeMl: 50, quantity: 1, unitPriceEur: "1" }] })),
    ).toEqual({ "lines.0.id": "Remplis ce champ." });
    const twice = { id: LINE_ID, volumeMl: 50, quantity: 1, unitPriceEur: "1" };
    expect(errors(updateDocumentInput.safeParse({ documentId: ID, lines: [twice, twice] }))).toEqual({
      "lines.1.id": "Cette ligne apparaît deux fois : recharge la page et réessaie.",
    });
    expect(errors(updateDocumentInput.safeParse({ documentId: ID, lines: [] }))).toEqual({
      lines: "Garde au moins un article : pour tout retirer, annule ou supprime le document.",
    });
  });
});

describe("gestes : pointage, statut, lot", () => {
  it("pointage : entier, borné par le serveur (négatif accepté ici)", () => {
    expect(setLineDeliveredInput.parse({ documentId: ID, lineId: LINE_ID, deliveredQuantity: -1 }).deliveredQuantity).toBe(-1);
    expect(setLineDeliveredInput.safeParse({ documentId: ID, lineId: LINE_ID, deliveredQuantity: 1.5 }).success).toBe(false);
  });

  it("statut : annuler n'est pas un statut cible (T5)", () => {
    expect(changeDocumentStatusInput.safeParse({ documentId: ID, to: "CONFIRMED" }).success).toBe(true);
    expect(errors(changeDocumentStatusInput.safeParse({ documentId: ID, to: "CANCELLED" }))).toEqual({
      to: "Choisis une des options proposées.",
    });
  });

  it("lot : un document au plus une fois par envoi", () => {
    const change = { documentId: ID, from: null, to: LINE_ID };
    expect(assignDocumentsToBatchInput.safeParse({ changes: [change] }).success).toBe(true);
    expect(errors(assignDocumentsToBatchInput.safeParse({ changes: [change, { ...change, to: null }] }))).toEqual({
      "changes.1.documentId": "Ce document apparaît deux fois : recharge la page et réessaie.",
    });
    expect(errors(assignDocumentsToBatchInput.safeParse({ changes: [] }))).toEqual({ changes: "Aucun changement à enregistrer." });
  });
});

describe("paiements de création (N1) et gestes d'argent du document (J6)", () => {
  const PAYMENT_ID = "9d2f3e4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a";
  const OTHER_ID = "0e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b";

  it("« Reçu maintenant » : montants normalisés, poche absente = « Non attribué », aucun paiement par défaut", () => {
    expect(createDocumentInput.parse(order()).payments).toEqual([]);
    expect(createDocumentInput.parse(order({ payments: [{ id: PAYMENT_ID, amount: "60,5" }] })).payments).toEqual([
      { id: PAYMENT_ID, amount: "60.50", pocketId: null },
    ]);
  });

  it("Σ des paiements > total ⇒ sous `payments` ; même paiement deux fois ⇒ sous son identifiant", () => {
    expect(
      errors(createDocumentInput.safeParse(order({ payments: [{ id: PAYMENT_ID, amount: "100" }, { id: OTHER_ID, amount: "20,01" }] }))),
    ).toEqual({ payments: "Le montant reçu dépasse le total (120,00 €)." });
    expect(
      errors(createDocumentInput.safeParse(order({ payments: [{ id: PAYMENT_ID, amount: "10" }, { id: PAYMENT_ID, amount: "10" }] }))),
    ).toEqual({ "payments.1.id": "Ce paiement apparaît deux fois : recharge la page et réessaie." });
  });

  it("vente directe sans nom : refusée, qu'il reste un dû après la saisie ou qu'elle soit payée en entier", () => {
    const sale = { origin: "DIRECT_SALE", customer: { kind: "passing", name: null } };
    expect(errors(createDocumentInput.safeParse(order({ ...sale, payments: [{ id: PAYMENT_ID, amount: "50" }] })))).toEqual({
      customer: "Choisis le client : il faut un nom pour suivre les 70,00 € à encaisser.",
    });
    expect(errors(createDocumentInput.safeParse(order({ ...sale, payments: [{ id: PAYMENT_ID, amount: "120" }] })))).toEqual({
      customer: SALE_NAME_REQUIRED_MESSAGE,
    });
  });

  it("annuler : remboursements facultatifs, chacun une fois, montants positifs", () => {
    expect(cancelDocumentInput.parse({ documentId: ID })).toEqual({ documentId: ID, refunds: [], confirm: false });
    expect(cancelDocumentInput.parse({ documentId: ID, refunds: [{ id: PAYMENT_ID, amount: "60" }], confirm: true })).toEqual({
      documentId: ID,
      refunds: [{ id: PAYMENT_ID, amount: "60.00", pocketId: null }],
      confirm: true,
    });
    expect(
      errors(cancelDocumentInput.safeParse({ documentId: ID, refunds: [{ id: PAYMENT_ID, amount: "0" }, { id: PAYMENT_ID, amount: "5" }] })),
    ).toEqual({
      "refunds.0.amount": "Indique un montant supérieur à 0 €.",
      "refunds.1.id": "Ce remboursement apparaît deux fois : recharge la page et réessaie.",
    });
  });

  it("livrer et encaisser : un paiement complet ; défaire : un jeton non vide", () => {
    expect(deliverAndCollectInput.parse({ documentId: ID, payment: { id: PAYMENT_ID, amount: "60" } })).toEqual({
      documentId: ID,
      payment: { id: PAYMENT_ID, amount: "60.00", pocketId: null },
      confirm: false,
    });
    expect(errors(deliverAndCollectInput.safeParse({ documentId: ID }))).toEqual({ payment: "Remplis ce champ." });
    expect(errors(revertDocumentChangeInput.safeParse({ token: "" }))).toEqual({ token: "Ce geste ne peut plus être annulé." });
  });
});
