import { describe, expect, it } from "vitest";
import { formatPhone, formatPhoneNational, normalizePhone, phoneSearchDigits } from "../phone";

describe("formatPhoneNational et phoneSearchDigits — recherche et légendes (06 E12, S06, S17)", () => {
  it("écrit un numéro français comme en France", () => {
    expect(formatPhoneNational("+33612345678")).toBe("06 12 34 56 78");
    expect(formatPhoneNational("+213555123456")).toBe("+213555123456");
  });

  it("rend les deux formes cherchables d'un numéro français", () => {
    expect(phoneSearchDigits("+33612345678")).toEqual(["33612345678", "0612345678"]);
    expect(phoneSearchDigits("+213555123456")).toEqual(["213555123456"]);
  });
});

describe("normalizePhone — formats français vers E.164", () => {
  it.each([
    ["06 12 34 56 78", "+33612345678"],
    ["0612345678", "+33612345678"],
    ["06.12.34.56.78", "+33612345678"],
    ["06-12-34-56-78", "+33612345678"],
    ["+33 6 12 34 56 78", "+33612345678"],
    ["+33612345678", "+33612345678"],
    ["+33 (0)6 12 34 56 78", "+33612345678"],
    ["+33 06 12 34 56 78", "+33612345678"],
    ["0033 6 12 34 56 78", "+33612345678"],
    ["01 23 45 67 89", "+33123456789"],
    ["\u00A006\u202F12 34 56 78 ", "+33612345678"],
  ])("« %s » → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("garde un numéro étranger complet", () => {
    expect(normalizePhone("+213 5 55 12 34 56")).toBe("+213555123456");
    expect(normalizePhone("00213 555 12 34 56")).toBe("+213555123456");
  });

  it.each([
    "",
    "abc",
    "06 12 34",
    "06 12 34 56 7",
    "06 12 34 56 789",
    "0012",
    "+33 6 12 34 56 7",
    "+33 0 12 34 56 78",
    "612345678",
    "+1234",
    "06 12 34 56 7a",
  ])("saisie invalide « %s » → null", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("aperçu « +33 6 12 34 56 78 »", () => {
    expect(formatPhone("+33612345678")).toBe("+33 6 12 34 56 78");
  });
  it("un numéro étranger est rendu tel quel", () => {
    expect(formatPhone("+213555123456")).toBe("+213555123456");
  });
});
