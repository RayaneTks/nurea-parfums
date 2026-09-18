import { describe, expect, it } from "vitest";
import { customerDeletionBlock, parseCustomersParams, type CustomerDirectoryEntry, type CustomerListRowDTO } from "@/contracts/customers";
import type { MoneyString } from "@/domain/money";
import {
  contactLinks,
  customersCountLabel,
  documentsCountLabel,
  frequentCaption,
  hasContact,
  historyAmount,
  historyCaption,
  historyTitle,
  homonymOf,
  phoneOwner,
  phonePreview,
  phoneTakenMessage,
  sectionsByLetter,
} from "../customers-model";

const m = (value: string) => value as MoneyString;

const row = (id: string, fullName: string, letter: string): CustomerListRowDTO => ({ id, fullName, letter, contact: null, due: null });

const DIRECTORY: CustomerDirectoryEntry[] = [
  { id: "fares", fullName: "Fares Benali", phoneE164: "+33612345678", whatsappE164: null },
  { id: "lina", fullName: "Lina Haddad", phoneE164: "+33698765432", whatsappE164: null },
];

describe("E12 — liste", () => {
  it("sections A–Z dans l'ordre du serveur : « Élise » sous « E », « # » à part", () => {
    const sections = sectionsByLetter([row("1", "Eden", "E"), row("2", "Élise", "E"), row("3", "Fares", "F"), row("4", "4 saisons", "#")]);
    expect(sections.map((section) => [section.letter, section.rows.map((r) => r.fullName)])).toEqual([
      ["E", ["Eden", "Élise"]],
      ["F", ["Fares"]],
      ["#", ["4 saisons"]],
    ]);
  });

  it("compteurs au singulier et au pluriel", () => {
    expect(customersCountLabel(124)).toBe("124 clients");
    expect(customersCountLabel(1)).toBe("1 client");
    expect(documentsCountLabel(5)).toBe("5 documents");
    expect(documentsCountLabel(1)).toBe("1 document");
  });

  it("paramètres : saisie rognée, pages bornées de 1 à 40", () => {
    expect(parseCustomersParams({ q: "  06 12 ", pages: "3" })).toEqual({ q: "06 12", pages: 3 });
    expect(parseCustomersParams({ q: null, pages: "0" })).toEqual({ q: "", pages: 1 });
    expect(parseCustomersParams({ pages: "999" }).pages).toBe(40);
    expect(parseCustomersParams({ pages: "abc" }).pages).toBe(1);
  });
});

describe("E14 — fiche", () => {
  it("contacts directs : chaque lien n'existe que si son champ existe", () => {
    expect(contactLinks({ phoneE164: "+33612345678", whatsappE164: "+33711223344", snapchat: "fares.b" })).toEqual({
      call: "tel:+33612345678",
      whatsapp: "https://wa.me/33711223344",
      snap: "https://www.snapchat.com/add/fares.b",
    });
    expect(contactLinks({ phoneE164: null, whatsappE164: null, snapchat: null })).toEqual({ call: null, whatsapp: null, snap: null });
    expect(hasContact({ phoneE164: null, whatsappE164: null, snapchat: "x" })).toBe(true);
    expect(hasContact({ phoneE164: null, whatsappE164: null, snapchat: null })).toBe(false);
  });

  it("historique : titre, légende hors du cours normal, « À encaisser » seulement sur un document engagé à dû", () => {
    const now = new Date("2026-09-17T08:00:00.000Z");
    expect(historyTitle({ origin: "DIRECT_SALE", orderedAt: "2026-08-03T10:00:00.000Z", itemCount: 2 }, now)).toBe("Vente du 3 août · 2 articles");
    expect(historyTitle({ origin: "ORDER", orderedAt: "2026-09-12T10:00:00.000Z", itemCount: 1 }, now)).toBe("Commande du 12 sept. · 1 article");
    expect(historyCaption({ status: "PENDING" })).toBe("En attente");
    expect(historyCaption({ status: "CANCELLED" })).toBe("Annulée");
    expect(historyCaption({ status: "DELIVERED" })).toBeUndefined();
    expect(historyAmount({ due: m("60.00"), total: m("120.00") })).toEqual({ kind: "due", value: "60.00" });
    expect(historyAmount({ due: m("0.00"), total: m("120.00") })).toEqual({ kind: "total", value: "120.00" });
    // Une annulée n'a pas de dû (null) : son total, jamais « à encaisser » (01 §4.10).
    expect(historyAmount({ due: null, total: m("90.00") })).toEqual({ kind: "total", value: "90.00" });
  });

  it("« Achète souvent » : « 4 fois · 80 ml »", () => {
    expect(frequentCaption({ times: 4, volumeMl: 80 })).toBe("4 fois · 80 ml");
    expect(frequentCaption({ times: 1, volumeMl: null })).toBe("1 fois");
  });

  it("suppression : la raison du refus, au singulier et au pluriel ; rien sans commande en cours", () => {
    expect(customerDeletionBlock(0)).toBeNull();
    expect(customerDeletionBlock(1)).toBe("Impossible : 1 commande en cours. Livre-la ou annule-la d'abord.");
    expect(customerDeletionBlock(2)).toBe("Impossible : 2 commandes en cours. Livre-les ou annule-les d'abord.");
  });
});

describe("E20 — formulaire", () => {
  it("aperçu normalisé dès que la saisie est reconnue", () => {
    expect(phonePreview("06 12 34 56 78")).toBe("+33 6 12 34 56 78");
    expect(phonePreview("06 12")).toBeNull();
    expect(phonePreview("")).toBeNull();
  });

  it("numéro déjà pris : trouvé sous toutes ses écritures, jamais sur la fiche modifiée elle-même", () => {
    expect(phoneOwner(DIRECTORY, "06 12 34 56 78", null)?.id).toBe("fares");
    expect(phoneOwner(DIRECTORY, "+33 6 12 34 56 78", null)?.id).toBe("fares");
    expect(phoneOwner(DIRECTORY, "06 12 34 56 78", "fares")).toBeUndefined();
    expect(phoneOwner(DIRECTORY, "06 00 00 00 00", null)).toBeUndefined();
    expect(phoneTakenMessage({ fullName: "Lina Haddad" })).toBe("Ce numéro est déjà celui de Lina Haddad.");
  });

  it("homonyme : nom normalisé (casse, accents, ponctuation) ou même téléphone", () => {
    expect(homonymOf(DIRECTORY, { fullName: "fares  BENALI", phone: "" }, null)?.id).toBe("fares");
    expect(homonymOf(DIRECTORY, { fullName: "Farès Benali", phone: "" }, null)?.id).toBe("fares");
    expect(homonymOf(DIRECTORY, { fullName: "Nora", phone: "06 98 76 54 32" }, null)?.id).toBe("lina");
    expect(homonymOf(DIRECTORY, { fullName: "Nora", phone: "" }, null)).toBeUndefined();
    expect(homonymOf(DIRECTORY, { fullName: "Fares Benali", phone: "" }, "fares")).toBeUndefined();
  });
});
