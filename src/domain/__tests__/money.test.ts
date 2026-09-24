import { describe, expect, it } from "vitest";
import {
  dzdFromDb,
  dzdToEur,
  eur,
  eurFromDb,
  eurFromWire,
  formatDzd,
  formatEur,
  halfForCash,
  parseDzdInput,
  parseEurInput,
  parseRateInput,
  percentOf,
  rateFromDb,
  spokenEur,
  toDb,
  toWire,
  type Dzd,
  type Eur,
  type MoneyString,
  type Rate,
} from "../money";

const NNBSP = "\u202F";
const MINUS_SIGN = "\u2212";

/** Montant de test lu comme en base : exact, signé. */
const E = (text: string): Eur => eurFromDb(text);
const DZD = (text: string): Dzd => dzdFromDb(text);
const R = (text: string): Rate => rateFromDb(text);

describe("money — les 14 cas obligatoires (04 §5.4)", () => {
  it("1. conversion courante : 30 000 DZD au taux 277 → 108,30 €", () => {
    expect(toWire(dzdToEur(DZD("30000"), R("277")))).toBe("108.30");
  });

  it("2. demi vers le haut : 201 DZD au taux 200 (1,005) → 1,01 €", () => {
    expect(toWire(dzdToEur(DZD("201"), R("200")))).toBe("1.01");
  });

  it("3. taux à quatre décimales : 25 000 DZD au taux 245,5000 → 101,83 €", () => {
    expect(toWire(dzdToEur(DZD("25000"), R("245.5000")))).toBe("101.83");
  });

  it("4. coût de ligne : 108,30 € × 2 → 216,60 €", () => {
    expect(toWire(eur.times(E("108.30"), 2))).toBe("216.60");
  });

  it("5. somme exacte : 0,10 € + 0,20 € → 0,30 €, égalité stricte", () => {
    const sum = eur.add(E("0.10"), E("0.20"));
    expect(eur.compare(sum, E("0.30"))).toBe(0);
    expect(toWire(sum)).toBe("0.30");
  });

  it("6. saisie à virgule : « 12,5 » → 12,50 €", () => {
    expect(toWire(parseEurInput("12,5")!)).toBe("12.50");
  });

  it("7. saisie avec espaces : « 1 234,56 » → 1 234,56 €", () => {
    for (const text of ["1 234,56", `1${NNBSP}234,56`, "1\u00A0234,56", " 1234.56 "]) {
      const v = parseEurInput(text);
      expect(v, text).not.toBeNull();
      expect(formatEur(v!)).toBe(`1${NNBSP}234,56${NNBSP}€`);
    }
  });

  it("8. saisie refusée : « 12,345 », « abc », « », « -3 » non signé → null", () => {
    expect(parseEurInput("12,345")).toBeNull();
    expect(parseEurInput("abc")).toBeNull();
    expect(parseEurInput("")).toBeNull();
    expect(parseEurInput("-3")).toBeNull();
  });

  it("9. saisie signée : « -3,5 » avec signed → -3,50 €", () => {
    const v = parseEurInput("-3,5", { signed: true })!;
    expect(toWire(v)).toBe("-3.50");
    expect(formatEur(v)).toBe(`\u22123,50${NNBSP}€`);
  });

  it("10. la moitié : 75,00 € ; 74,00 € ; 0,90 € → 38,00 € ; 37,00 € ; 0,45 €", () => {
    expect(toWire(halfForCash(E("75.00")))).toBe("38.00");
    expect(toWire(halfForCash(E("74.00")))).toBe("37.00");
    expect(toWire(halfForCash(E("0.90")))).toBe("0.45");
  });

  it("11. pourcentage : 23,40 sur 100,00 → « 23,4 » ; x sur 0 → null", () => {
    expect(percentOf(E("23.40"), E("100.00"))).toBe("23,4");
    expect(percentOf(E("23.40"), eur.zero)).toBeNull();
  });

  it("12. frontière base : Prisma.Decimal(\"-12.3\") → -12,30 €", () => {
    // Objet au toString() de Prisma.Decimal : le domaine n'importe jamais @prisma/client.
    const prismaDecimal = { toString: () => "-12.3" };
    const v = eurFromDb(prismaDecimal);
    expect(toWire(v)).toBe("-12.30");
    expect(formatEur(v)).toBe(`\u221212,30${NNBSP}€`);
  });

  it("13. formatage : 1 234,5 € → « 1 234,50 € » avec U+202F", () => {
    expect(formatEur(E("1234.5"))).toBe("1\u202F234,50\u202F€");
  });

  it("14. quantité invalide : times(x, 1.5) → exception", () => {
    expect(() => eur.times(E("10.00"), 1.5)).toThrow();
    expect(() => eur.times(E("10.00"), -1)).toThrow();
  });
});

describe("money — saisie", () => {
  it("accepte le point, « 12, » en cours de frappe, « ,5 » et le suffixe €", () => {
    expect(toWire(parseEurInput("12.5")!)).toBe("12.50");
    expect(toWire(parseEurInput("12,")!)).toBe("12.00");
    expect(toWire(parseEurInput(",5")!)).toBe("0.50");
    expect(toWire(parseEurInput("12,50 €")!)).toBe("12.50");
  });

  it("refuse un séparateur de milliers ambigu, un signe seul et un montant hors colonne", () => {
    expect(parseEurInput("1.234,56")).toBeNull();
    expect(parseEurInput(",")).toBeNull();
    expect(parseEurInput("-", { signed: true })).toBeNull();
    expect(parseEurInput("100000000")).toBeNull();
    expect(parseEurInput("99999999,99")).not.toBeNull();
  });

  it("accepte le signe moins typographique en saisie signée", () => {
    expect(toWire(parseEurInput("\u22122,00", { signed: true })!)).toBe("-2.00");
  });

  it("dinars : deux décimales, jamais négatifs", () => {
    expect(formatDzd(parseDzdInput("9 000")!)).toBe(`9${NNBSP}000${NNBSP}DA`);
    expect(parseDzdInput("9000,125")).toBeNull();
    expect(parseDzdInput("-5")).toBeNull();
  });

  it("taux : quatre décimales au plus, strictement positif", () => {
    expect(toDb(parseRateInput("245,5")!)).toBe("245.50");
    expect(toDb(parseRateInput("245,1234")!)).toBe("245.1234");
    expect(parseRateInput("245,12345")).toBeNull();
    expect(parseRateInput("0")).toBeNull();
  });
});

describe("money — frontières", () => {
  it("toWire / eurFromWire font l'aller-retour, et une chaîne mal formée lève", () => {
    expect(toWire(eurFromWire("-0.05" as MoneyString))).toBe("-0.05");
    expect(() => eurFromWire("12.5" as MoneyString)).toThrow();
    expect(() => eurFromWire("12,50" as MoneyString)).toThrow();
  });

  it("une valeur de base à plus de deux décimales est une requête fautive : exception", () => {
    expect(() => eurFromDb("1.005")).toThrow();
    expect(toWire(eurFromDb("12.3000"))).toBe("12.30");
    expect(() => rateFromDb("0")).toThrow();
  });

  it("toDb garde au moins deux décimales", () => {
    expect(toDb(E("108.3"))).toBe("108.30");
    expect(toDb(R("277"))).toBe("277.00");
  });
});

describe("money — arithmétique", () => {
  it("clampZero, max, min, neg, sum, isNegative", () => {
    expect(toWire(eur.clampZero(E("-4.00")))).toBe("0.00");
    expect(toWire(eur.max(E("1.00"), E("2.00")))).toBe("2.00");
    expect(toWire(eur.min(E("1.00"), E("2.00")))).toBe("1.00");
    expect(toWire(eur.neg(E("1.00")))).toBe("-1.00");
    expect(toWire(eur.sum([E("0.10"), E("0.20"), E("-0.05")]))).toBe("0.25");
    expect(eur.isNegative(E("-0.01"))).toBe(true);
    expect(eur.isNegative(eur.zero)).toBe(false);
    expect(eur.isZero(eur.sub(E("0.30"), eur.add(E("0.10"), E("0.20"))))).toBe(true);
  });

  it("la moitié d'un centime reste un centime, celle d'un euro arrondit à l'euro", () => {
    expect(toWire(halfForCash(E("0.01")))).toBe("0.01");
    expect(toWire(halfForCash(E("1.00")))).toBe("1.00");
  });

  it("pourcentage négatif et arrondi demi vers le haut", () => {
    expect(percentOf(E("-12.50"), E("100.00"))).toBe("\u221212,5");
    expect(percentOf(E("1.00"), E("3.00"))).toBe("33,3");
    expect(percentOf(E("2.00"), E("3.00"))).toBe("66,7");
  });
});

describe("money — affichage", () => {
  it("compact masque les centimes nuls sans jamais arrondir, signed marque les positifs", () => {
    expect(formatEur(E("1234.00"), { compact: true })).toBe(`1${NNBSP}234${NNBSP}€`);
    expect(formatEur(E("1234.50"), { compact: true })).toBe(`1${NNBSP}234,50${NNBSP}€`);
    expect(formatEur(E("-0.40"), { compact: true })).toBe(`${MINUS_SIGN}0,40${NNBSP}€`);
    expect(formatEur(E("12.00"), { signed: true })).toBe(`+12,00${NNBSP}€`);
    expect(formatEur(eur.zero, { signed: true })).toBe(`0,00${NNBSP}€`);
  });

  it("spokenEur lit les euros puis les centimes", () => {
    expect(spokenEur(E("1234.50"))).toBe(`1${NNBSP}234 euros 50`);
    expect(spokenEur(E("1.00"))).toBe("1 euro");
    expect(spokenEur(E("0.45"))).toBe("45 centimes");
    expect(spokenEur(E("-3.05"))).toBe("moins 3 euros 5");
  });
});

describe("dinars d'achat (E06)", () => {
  it("dzd.times et dzd.sum exacts ; formatRate sans zéros de fin ; sameRate à la décimale près", async () => {
    const { dzd, dzdFromDb, formatDzd, formatRate, rateFromDb, sameRate } = await import("../money");
    const total = dzd.sum([dzd.times(dzdFromDb("22000.00"), 2), dzdFromDb("9000.50")]);
    expect(formatDzd(total)).toBe("53\u202F000,50\u202FDA");
    expect(() => dzd.times(dzdFromDb("1.00"), 1.5)).toThrow(RangeError);
    expect(formatRate(rateFromDb("277.0000"))).toBe("277");
    expect(formatRate(rateFromDb("277.5000"))).toBe("277,5");
    expect(sameRate(rateFromDb("277.0000"), rateFromDb("277"))).toBe(true);
  });
});
