"use server";

import { Resend } from "resend";
import { CONTACT } from "@/lib/data";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const MAX_NAME_LEN = 80;
const MAX_SUBJECT_LEN = 120;
const MAX_MESSAGE_LEN = 2000;
const MAX_EMAIL_LEN = 120;

export type ContactSubmitResult =
  | { ok: true; via: "resend" }
  | { ok: true; via: "mailto" }
  | { ok: false; error: string };

export async function submitContactForm(
  formData: FormData
): Promise<ContactSubmitResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name) return { ok: false, error: "Indiquez votre nom." };
  if (name.length > MAX_NAME_LEN)
    return { ok: false, error: `Nom trop long (max ${MAX_NAME_LEN} caractères).` };
  if (!email) return { ok: false, error: "Indiquez votre e-mail." };
  if (email.length > MAX_EMAIL_LEN)
    return { ok: false, error: `E-mail trop long (max ${MAX_EMAIL_LEN} caractères).` };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Format d’e-mail invalide." };
  if (!subject) return { ok: false, error: "Indiquez un sujet." };
  if (subject.length > MAX_SUBJECT_LEN)
    return {
      ok: false,
      error: `Sujet trop long (max ${MAX_SUBJECT_LEN} caractères).`,
    };
  if (!message) return { ok: false, error: "Écrivez votre message." };
  if (message.length > MAX_MESSAGE_LEN)
    return {
      ok: false,
      error: `Message trop long (max ${MAX_MESSAGE_LEN} caractères).`,
    };

  const to = process.env.CONTACT_TO_EMAIL ?? CONTACT.email;
  const from = process.env.RESEND_FROM;

  if (!process.env.RESEND_API_KEY || !from) {
    return { ok: true, via: "mailto" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Nurea] ${subject}`,
      text: `Nom : ${name}\nE-mail : ${email}\n\n${message}`,
    });
    if (error) {
      console.error("[contact]", error);
      return { ok: true, via: "mailto" };
    }
    return { ok: true, via: "resend" };
  } catch (e) {
    console.error("[contact]", e);
    return { ok: true, via: "mailto" };
  }
}
