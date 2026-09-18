import { describe, expect, it } from "vitest";
import type { PricingRow } from "@/contracts/catalogue";
import type { MoneyString } from "@/domain/money";
import { splitOffCatalogQuery } from "../PerfumePicker";
import {
  costSummary,
  decimalText,
  draftMargin,
  draftTotal,
  missingOf,
  newCatalogueLine,
  newOffCatalogLine,
  priceHint,
  stockBadgeOf,
  withArrivedPricing,
  withGift,
  withVolume,
} from "../line-draft";

const m = (value: string) => value as MoneyString;
const row = (volumeMl: 10 | 50 | 80, price: string, cost: string | null, rate: string | null): PricingRow => ({
  volumeMl,
  unitPriceEur: m(price),
  unitCostDzd: cost,
  exchangeRate: rate,
  unitCostEur: null,
});

const SAUVAGE = { id: 1, name: "Sauvage", brandName: "Dior", image: "", pricing: [row(80, "120.00", "22000.00", "277.0000"), row(50, "85.00", "15000.00", "277.0000")] };

describe("ligne en saisie (E11, S01 en édition)", () => {
  it("décimales lisibles : « 30000.00 » → « 30000 », « 277.5000 » → « 277,5 »", () => {
    expect(decimalText("30000.00")).toBe("30000");
    expect(decimalText("277.5000")).toBe("277,5");
    expect(decimalText(null)).toBe("");
  });

  it("une ligne neuve prend 80 ml par défaut et sa mémoire de prix ; changer de volume re-remplit", () => {
    const line = newCatalogueLine("l1", SAUVAGE);
    expect(line).toMatchObject({ volumeMl: 80, price: "120", cost: "22000", rate: "277", isNew: true });
    expect(withVolume(line, 50, SAUVAGE.pricing[1])).toMatchObject({ volumeMl: 50, price: "85", cost: "15000" });
    // Sans mémoire pour ce volume : la saisie est gardée.
    expect(withVolume(line, 10, undefined)).toMatchObject({ volumeMl: 10, price: "120" });
  });

  it("« Offert » met le prix de côté et le restaure", () => {
    const line = newCatalogueLine("l1", SAUVAGE);
    const gift = withGift(line, true);
    expect(gift.isGift).toBe(true);
    expect(withGift({ ...gift, price: "" }, false).price).toBe("120");
  });

  it("ce qui manque, dans l'ordre : volume, prix, taux", () => {
    const line = newCatalogueLine("l1", SAUVAGE);
    expect(missingOf(line)).toBeNull();
    expect(missingOf({ ...line, volumeMl: 30 })).toEqual({ field: "volume", label: "Choisir le volume · Sauvage" });
    expect(missingOf({ ...line, price: "" })).toEqual({ field: "price", label: "Ajouter le prix · Sauvage 80 ml" });
    expect(missingOf({ ...line, rate: "" })).toEqual({ field: "rate", label: "Ajouter le taux · Sauvage" });
    expect(missingOf({ ...line, price: "", isGift: true })).toBeNull();
  });

  it("total, « Marge avant dépenses » et rangée « Coût »", () => {
    const line = { ...newCatalogueLine("l1", SAUVAGE), quantity: 2 };
    expect(draftTotal([line])).toEqual(draftTotal([{ ...line, quantity: 1 }, { ...line, id: "l2", quantity: 1 }]));
    expect(draftMargin([line])).not.toBeNull();
    expect(draftMargin([{ ...line, cost: "" }])).toBeNull();
    expect(costSummary({ ...line, cost: "" })).toEqual({ text: "Coût à compléter", unknown: true });
    expect(costSummary({ ...line, rate: "" })).toEqual({ text: "Taux à compléter", unknown: true });
    expect(costSummary({ ...line, note: "Coffret" }).text).toMatch(/^22\s?000\sDA · taux 277 · 79,42\s?€ · Coffret$/);
  });

  it("aide de la mémoire de prix (N8)", () => {
    const line = newCatalogueLine("l1", SAUVAGE);
    expect(priceHint(line, SAUVAGE.pricing[0])).toBeNull();
    expect(priceHint({ ...line, price: "110" }, SAUVAGE.pricing[0])).toMatch(/^dernier prix : 120,00/);
    expect(priceHint({ ...line, volumeMl: 10, price: "" }, undefined)).toBe("Aucun prix mémorisé pour 10 ml");
    expect(priceHint(newOffCatalogLine("l2", "Khamrah", "Lattafa"), undefined)).toBeNull();
  });

  it("la mémoire arrivée après la ligne la complète", () => {
    const early = { ...newCatalogueLine("l1", { ...SAUVAGE, pricing: [] }, { fallbackPrice: m("110.00"), defaultRate: "277.00" }), awaitingPricing: true };
    expect(early).toMatchObject({ price: "110", cost: "", rate: "277" });
    const filled = withArrivedPricing(early, SAUVAGE.pricing[0], "277.00");
    expect(filled).toMatchObject({ price: "120", cost: "22000", rate: "277" });
    expect(filled.awaitingPricing).toBeUndefined();
  });

  it("un badge au plus : rupture, stock bas, masqué", () => {
    expect(stockBadgeOf({ stockStatus: "out", status: "DRAFT" })?.label).toBe("Rupture");
    expect(stockBadgeOf({ stockStatus: "low", status: "PUBLISHED" })?.label).toBe("Stock bas");
    expect(stockBadgeOf({ stockStatus: "ok", status: "DRAFT" })?.label).toBe("Masqué");
    expect(stockBadgeOf({ stockStatus: "untracked", status: "PUBLISHED" })).toBeNull();
  });
});

describe("hors catalogue (S05)", () => {
  it("« lattafa khamrah » : la marque connue en tête devient la marque", () => {
    expect(splitOffCatalogQuery("lattafa khamrah", ["Dior", "Lattafa"])).toEqual({ name: "khamrah", brand: "Lattafa" });
    expect(splitOffCatalogQuery("Yves Saint Laurent libre", ["Yves Saint Laurent"])).toEqual({ name: "libre", brand: "Yves Saint Laurent" });
    expect(splitOffCatalogQuery("aventus", ["Dior"])).toEqual({ name: "aventus", brand: "" });
    expect(splitOffCatalogQuery("dior", ["Dior"])).toEqual({ name: "dior", brand: "" });
  });
});
