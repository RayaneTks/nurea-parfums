"use client";

import type { FC, FormEvent } from "react";
import { useState } from "react";
import { CONTACT } from "@/lib/data";
import { buildContactMailto } from "@/lib/contactMailto";
import { submitContactForm } from "@/actions/contact";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SnapchatIcon, WhatsAppIcon } from "@/components/ui/Icons";

interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type FieldErrors = Partial<Record<keyof ContactFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

interface ContactSectionProps {
  /** Pré-remplissage venu d'une fiche produit. */
  parfum?: string;
  marque?: string;
}

function initialState(parfum: string, marque: string): ContactFormState {
  if (!parfum && !marque) {
    return { name: "", email: "", subject: "", message: "" };
  }
  const label = [marque, parfum].filter(Boolean).join(" — ");
  return {
    name: "",
    email: "",
    subject: `Commander — ${label}`,
    message: `Bonjour,\nJe souhaite commander le parfum ${parfum}${marque ? ` de ${marque}` : ""}.\n\n`,
  };
}

function validate(state: ContactFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!state.name.trim()) errors.name = "Indiquez votre nom.";
  if (!state.email.trim()) errors.email = "Indiquez votre e-mail.";
  else if (!EMAIL_PATTERN.test(state.email.trim())) {
    errors.email = "Format d'e-mail invalide.";
  }
  if (!state.subject.trim()) errors.subject = "Indiquez un sujet.";
  if (!state.message.trim()) errors.message = "Écrivez votre message.";
  return errors;
}

/**
 * Page de contact — canaux directs à gauche, formulaire à droite.
 *
 * Charte § 05 : un seul aplat plein par écran. Il revient à Snapchat, canal
 * principal ; l'envoi du formulaire reste au filet, ce qui reflète aussi le
 * délai de réponse réel des deux voies.
 */
export const ContactSection: FC<ContactSectionProps> = ({
  parfum = "",
  marque = "",
}) => {
  const contextLabel = [marque, parfum].filter(Boolean).join(" — ");

  const [form, setForm] = useState<ContactFormState>(() =>
    initialState(parfum, marque)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sentVia, setSentVia] = useState<"resend" | "mailto" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const patch = (key: keyof ContactFormState) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const payload = new FormData();
    payload.set("name", form.name.trim());
    payload.set("email", form.email.trim());
    payload.set("subject", form.subject.trim());
    payload.set("message", form.message.trim());

    try {
      const result = await submitContactForm(payload);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      /* Sans service d'envoi configuré, on repasse la main à la messagerie
         du visiteur plutôt que de perdre le message. */
      if (result.via === "mailto") {
        window.location.href = buildContactMailto({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        });
      }

      setSentVia(result.via === "mailto" ? "mailto" : "resend");
      setForm(initialState(parfum, marque));
      setErrors({});
    } catch {
      setServerError(
        "Envoi impossible pour le moment. Réessayez, ou écrivez-nous directement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="nurea-page pb-18 pt-32 md:pt-40">
      <ScrollReveal>
        <p className="nurea-label">Contact</p>
        <h1 className="nurea-title mt-4 text-nurea-text">Passer commande</h1>
        <p className="nurea-body nurea-prose mt-6">
          Une question sur un parfum, ou une commande à passer ? Nous répondons
          vite. Basés à Marseille, nous expédions dans toute la France.
        </p>
      </ScrollReveal>

      <div className="mt-12 grid gap-px border border-nurea-border bg-nurea-border md:mt-18 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="bg-nurea-bg p-6 md:p-10">
          <h2 className="nurea-label">Réponse rapide</h2>
          <p className="nurea-caption mt-2">Snapchat est notre canal principal.</p>

          <div className="mt-6 flex flex-col items-start gap-3">
            <a
              href={CONTACT.snapchat}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("solid", "w-full")}
            >
              <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
              Snapchat
            </a>

            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("outline", "w-full")}
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0" aria-hidden />
              WhatsApp
            </a>
          </div>

          <dl className="mt-10 border-t border-nurea-border pt-6">
            <dt className="nurea-caption">Courrier électronique</dt>
            <dd className="mt-1">
              <a
                href={`mailto:${CONTACT.email}`}
                className="break-words text-nurea-text transition-colors duration-nurea ease-out hover:text-nurea-accent"
              >
                {CONTACT.email}
              </a>
            </dd>

            <dt className="nurea-caption mt-6">Zone</dt>
            <dd className="mt-1 text-nurea-muted">{CONTACT.location}</dd>
          </dl>
        </section>

        <section className="bg-nurea-bg p-6 md:p-10">
          <h2 className="nurea-label">Formulaire</h2>

          {contextLabel && !sentVia ? (
            <p className="mt-6 border border-nurea-border p-4">
              <span className="nurea-caption block">Parfum sélectionné</span>
              <span className="nurea-name mt-1 block text-nurea-text">
                {contextLabel}
              </span>
            </p>
          ) : null}

          {sentVia ? (
            <div className="mt-6" role="status">
              <p className="nurea-name text-nurea-text">Merci pour votre message</p>
              <p className="nurea-body mt-3">
                {sentVia === "resend"
                  ? "Nous vous répondons dans les plus brefs délais."
                  : "Votre messagerie vient de s'ouvrir. Si ce n'est pas le cas, écrivez-nous directement à l'adresse ci-contre."}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="name"
                  name="name"
                  label="Votre nom"
                  autoComplete="name"
                  value={form.name}
                  error={errors.name}
                  onChange={patch("name")}
                />
                <Field
                  id="email"
                  name="email"
                  type="email"
                  label="Votre e-mail"
                  autoComplete="email"
                  value={form.email}
                  error={errors.email}
                  onChange={patch("email")}
                />
              </div>

              <Field
                id="subject"
                name="subject"
                label="Sujet"
                value={form.subject}
                error={errors.subject}
                onChange={patch("subject")}
              />

              <Field
                id="message"
                name="message"
                label="Votre message"
                multiline
                value={form.message}
                error={errors.message}
                onChange={patch("message")}
              />

              {!contextLabel && (
                <p className="nurea-caption">
                  Précisez la marque et le nom du parfum pour une réponse plus
                  précise.
                </p>
              )}

              {serverError ? (
                <p role="alert" className="nurea-caption text-nurea-alert">
                  {serverError}
                </p>
              ) : null}

              <Button type="submit" variant="outline" disabled={submitting}>
                {submitting ? "Transmission…" : "Envoyer le message"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
};
