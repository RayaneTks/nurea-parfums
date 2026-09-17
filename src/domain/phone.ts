/**
 * Téléphones : saisis comme on les écrit en France, stockés en E.164 (`Customer.phoneE164`,
 * `whatsappE164`, unique). L'existant exigeait « +33612345678 » à la frappe : « 06… » était
 * refusé à la saisie et introuvable à la recherche (06 F-4.10-01).
 */

const FRANCE = "33";

/**
 * « 06 12 34 56 78 », « 06.12.34.56.78 », « +33 6 12 34 56 78 », « +33 (0)6 12… »,
 * « 0033 6 12… » → « +33612345678 ». Un numéro étranger en « +XXX » ou « 00XXX » est gardé
 * s'il a la longueur E.164 (8 à 15 chiffres). Toute autre saisie → `null` : on ne devine pas.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/\(0\)/g, "").replace(/[\s.\-/()]/g, "");
  let international: string;
  if (/^\+\d+$/.test(compact)) international = compact.slice(1);
  else if (/^00\d+$/.test(compact)) international = compact.slice(2);
  else if (/^0[1-9]\d{8}$/.test(compact)) return `+${FRANCE}${compact.slice(1)}`;
  else return null;

  if (international.startsWith(FRANCE)) {
    // « +33 06… » : le 0 national recopié derrière l'indicatif.
    const national = international.slice(FRANCE.length).replace(/^0(?=\d{9}$)/, "");
    return /^[1-9]\d{8}$/.test(national) ? `+${FRANCE}${national}` : null;
  }
  return /^[1-9]\d{7,14}$/.test(international) ? `+${international}` : null;
}

/** Aperçu lisible : « +33 6 12 34 56 78 » ; un numéro étranger est rendu tel quel. */
export function formatPhone(e164: string): string {
  const m = /^\+33([1-9])(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+33 ${m.slice(1).join(" ")}` : e164;
}

/**
 * Comme on l'écrit en France : « 06 12 34 56 78 » (légendes de liste, 06 E12, S06) ; un numéro étranger est
 * rendu en format international lisible.
 */
export function formatPhoneNational(e164: string): string {
  const m = /^\+33([1-9])(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `0${m[1]} ${m.slice(2).join(" ")}` : e164;
}

/** Chiffres d'un E.164 sous ses deux formes cherchables : « 33612345678 » et « 0612345678 ». */
export function phoneSearchDigits(e164: string): string[] {
  const digits = e164.replace(/\D/g, "");
  return /^33[1-9]\d{8}$/.test(digits) ? [digits, `0${digits.slice(2)}`] : [digits];
}
