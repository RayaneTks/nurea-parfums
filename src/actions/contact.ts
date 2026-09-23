"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { CONTACT } from "@/lib/data";
import { inspectContactForm } from "@/lib/contact/guard";
import { createRateLimiter, rateLimitKey } from "@/lib/security/rate-limit";

export type ContactSubmitResult =
  | { ok: true; via: "resend" }
  | { ok: true; via: "mailto" }
  | { ok: false; error: string };

/**
 * Cinq messages par quart d'heure et par adresse (audit du 23/09/2026, constat faible
 * « formulaire sans protection anti-abus »).
 *
 * Le risque n'est pas la compromission : c'est la boîte mail noyée. Cinq envois d'affilée
 * couvrent largement le visiteur qui se reprend, et coupent court à la boucle d'un robot. Le leurre
 * et le chronomètre de `src/lib/contact/guard.ts` arrêtent le reste ; la limite est le filet en
 * dessous, pour le robot qui saurait les franchir.
 */
const contactLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

const TOO_MANY = "Trop de messages envoyés d’affilée. Réessayez dans quelques minutes.";

export async function submitContactForm(formData: FormData): Promise<ContactSubmitResult> {
  const verdict = inspectContactForm(formData);

  /* Un robot repart avec un « envoyé » et rien de plus : lui nommer ce qui l'a trahi, c'est
     l'aider au tour suivant. Aucun humain ne peut atterrir ici. */
  if (verdict.kind === "discard") return { ok: true, via: "resend" };
  if (verdict.kind === "invalid") return { ok: false, error: verdict.error };

  const quota = contactLimiter.check(rateLimitKey("contact", await headers()));
  if (!quota.ok) return { ok: false, error: TOO_MANY };

  const { name, email, subject, message } = verdict.fields;
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
      subject: `[Nuréa] ${subject}`,
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
