/**
 * Ce qu'on accepte d'un formulaire public, et ce qu'on refuse sans le dire.
 *
 * Pur, sans I/O : `src/actions/contact.ts` s'en sert côté serveur, ses tests l'appellent
 * directement. Rien ici ne dépend de la messagerie utilisée.
 */

/** Champ leurre : invisible et hors du parcours au clavier, donc jamais rempli par un humain. */
export const HONEYPOT_FIELD = "societe";

/** Temps de saisie mesuré par le navigateur, en millisecondes. */
export const ELAPSED_FIELD = "duree";

/**
 * Sous deux secondes, ce n'est pas une frappe.
 *
 * Le plus court des messages réels demande le temps de lire quatre libellés et de taper une
 * adresse. Un robot poste l'instant d'après le chargement.
 */
export const MIN_ELAPSED_MS = 2_000;

/** Longueurs maximales : au-delà, c'est un dépôt, pas un message. */
export const MAX_LENGTHS = { name: 120, email: 200, subject: 200, message: 5_000 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/**
 * Retire les retours à la ligne et les caractères de contrôle d'une valeur d'une seule ligne.
 *
 * Nom, adresse et sujet finissent dans des en-têtes de courriel. L'API d'envoi les transmet en JSON
 * et fait elle-même l'échappement, mais on ne délègue pas une règle de sûreté à une dépendance :
 * un `\r\n` dans un sujet est une tentative d'injection d'en-tête, et rien d'autre.
 */
export function singleLine(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Message multiligne : les sauts de ligne restent, le reste des caractères de contrôle part. */
export function multiLine(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]+/g, "").replace(/\r\n?/g, "\n").trim();
}

export type ContactFields = { name: string; email: string; subject: string; message: string };

export type ContactGuardVerdict =
  | { kind: "ok"; fields: ContactFields }
  /** Refus honnête : la saisie est à corriger, on le dit. */
  | { kind: "invalid"; error: string }
  /**
   * Refus silencieux : on répond « envoyé » sans rien envoyer.
   *
   * Dire à un robot ce qui l'a trahi, c'est lui donner de quoi passer au tour suivant. Un humain ne
   * peut pas tomber ici : ni le leurre ni le chronomètre ne se déclenchent sur une saisie réelle.
   */
  | { kind: "discard"; reason: "honeypot" | "trop-rapide" };

function read(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export function inspectContactForm(form: FormData): ContactGuardVerdict {
  if (read(form, HONEYPOT_FIELD).trim() !== "") return { kind: "discard", reason: "honeypot" };

  const elapsed = Number(read(form, ELAPSED_FIELD));
  // Absent ou illisible : le formulaire de la page en pose toujours un.
  if (!Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) return { kind: "discard", reason: "trop-rapide" };

  const name = singleLine(read(form, "name"));
  const email = singleLine(read(form, "email"));
  const subject = singleLine(read(form, "subject"));
  const message = multiLine(read(form, "message"));

  if (!name) return { kind: "invalid", error: "Indiquez votre nom." };
  if (!email) return { kind: "invalid", error: "Indiquez votre e-mail." };
  if (!EMAIL_RE.test(email)) return { kind: "invalid", error: "Format d’e-mail invalide." };
  if (!subject) return { kind: "invalid", error: "Indiquez un sujet." };
  if (!message) return { kind: "invalid", error: "Écrivez votre message." };

  if (name.length > MAX_LENGTHS.name) return { kind: "invalid", error: "Nom trop long." };
  if (email.length > MAX_LENGTHS.email) return { kind: "invalid", error: "Adresse e-mail trop longue." };
  if (subject.length > MAX_LENGTHS.subject) return { kind: "invalid", error: "Sujet trop long." };
  if (message.length > MAX_LENGTHS.message) {
    return { kind: "invalid", error: `Message trop long (${MAX_LENGTHS.message} caractères au maximum).` };
  }

  return { kind: "ok", fields: { name, email, subject, message } };
}
