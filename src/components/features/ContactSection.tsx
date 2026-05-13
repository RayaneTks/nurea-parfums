"use client";

import type { FC, FormEvent } from "react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { ArrowRight, Send } from "lucide-react";
import { WhatsAppIcon, SnapchatIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/data";
import { buildContactMailto } from "@/lib/contactMailto";
import { submitContactForm } from "@/actions/contact";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export const ContactSection: FC = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const [formState, setFormState] = useState<ContactFormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ContactFormState, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitChannel, setSubmitChannel] = useState<"resend" | "mailto" | null>(
    null
  );
  const [serverError, setServerError] = useState<string | null>(null);

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const nextErrors: Partial<Record<keyof ContactFormState, string>> = {};
    if (!formState.name.trim()) nextErrors.name = "Indiquez votre nom.";
    if (!formState.email.trim()) nextErrors.email = "Indiquez votre e-mail.";
    else if (!EMAIL_RE.test(formState.email.trim())) {
      nextErrors.email = "Format d’e-mail invalide.";
    }
    if (!formState.subject.trim()) nextErrors.subject = "Indiquez un sujet.";
    if (!formState.message.trim()) {
      nextErrors.message = "Écrivez votre message.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    const fd = new FormData();
    fd.set("name", formState.name.trim());
    fd.set("email", formState.email.trim());
    fd.set("subject", formState.subject.trim());
    fd.set("message", formState.message.trim());

    try {
      const result = await submitContactForm(fd);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      if (result.via === "mailto") {
        const mailto = buildContactMailto({
          name: formState.name.trim(),
          email: formState.email.trim(),
          subject: formState.subject.trim(),
          message: formState.message.trim(),
        });
        window.location.href = mailto;
        setSubmitChannel("mailto");
        setFormState({ name: "", email: "", subject: "", message: "" });
        setFieldErrors({});
        setIsSubmitted(true);
        return;
      }

      setSubmitChannel("resend");
      setFormState({ name: "", email: "", subject: "", message: "" });
      setFieldErrors({});
      setIsSubmitted(true);
    } catch {
      setServerError(
        "Envoi impossible pour le moment. Réessayez ou repassez par la page Contact plus tard."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="relative w-full overflow-x-clip">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[520px] -translate-x-1/2 bg-[var(--nurea-accent)] opacity-[0.03] blur-[110px]" />

      <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-24 md:px-10 md:pb-24 md:pt-36">
        <ScrollReveal className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <span className="mb-3 block text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--nurea-accent)]">
            Contact
          </span>
          <h1 className="mb-4 font-serif text-[clamp(28px,7vw,48px)] leading-[1.1] text-[var(--nurea-text)]">
            Passer Commande
          </h1>
          <p className="mx-auto max-w-lg text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
            Une question sur un parfum ou une commande à passer ? Nous sommes disponibles pour vous conseiller. Basés à Marseille, nous expédions dans toute la France.
          </p>
        </ScrollReveal>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_1.2fr] md:gap-10">
          <ScrollReveal direction="left" className="space-y-4">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--nurea-text-muted)]">
              Réponse Rapide
            </h2>

            <a
              href={CONTACT.snapchat}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-[72px] items-center gap-4 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-4 py-4 transition-colors hover:border-[var(--nurea-snapchat)] hover:bg-[var(--nurea-surface-hover)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-colors group-hover:border-[var(--nurea-snapchat)]">
                <SnapchatIcon className="h-6 w-6 text-[var(--nurea-text-muted)] transition-colors group-hover:text-[var(--nurea-snapchat)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
                  Canal Principal
                </p>
                <p className="font-serif text-[18px] text-[var(--nurea-text)]">Snapchat</p>
              </div>
              <ArrowRight size={16} className="text-[var(--nurea-text-muted)] transition-transform group-hover:-rotate-45" />
            </a>

            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-[72px] items-center gap-4 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-4 py-4 transition-colors hover:border-[var(--nurea-accent)] hover:bg-[var(--nurea-surface-hover)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-colors group-hover:border-[var(--nurea-accent)]">
                <WhatsAppIcon className="h-6 w-6 text-[var(--nurea-text-muted)] transition-colors group-hover:text-[var(--nurea-accent)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
                  Disponibilité Immédiate
                </p>
                <p className="font-serif text-[18px] text-[var(--nurea-text)]">WhatsApp</p>
              </div>
              <ArrowRight size={16} className="text-[var(--nurea-accent)] transition-transform group-hover:-rotate-45" />
            </a>

            <div className="border border-[var(--nurea-border)] bg-[var(--nurea-surface)] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)]">
                Courrier Électronique
              </p>
              <a href={`mailto:${CONTACT.email}`} className="mt-1 block text-[15px] text-[var(--nurea-text)] hover:text-[var(--nurea-accent)]">
                {CONTACT.email}
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={100}>
            <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-5 md:p-7">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--nurea-text-muted)]">
                Formulaire
              </h3>
              <p className="mb-6 mt-1 font-serif text-[22px] text-[var(--nurea-text)]">
                Nous Contacter
              </p>

              {isSubmitted ? (
                <div className="animate-fade-in-up py-10 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
                    {submitChannel === "resend" ? "Message transmis" : "Messagerie ouverte"}
                  </p>
                  <p className="mt-2 font-serif text-[22px] text-[var(--nurea-text)]">
                    Merci pour votre message
                  </p>
                  <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                    {submitChannel === "resend"
                      ? "Nous vous répondrons dans les plus brefs délais."
                      : "Si votre application ne s'ouvre pas, n'hésitez pas à nous écrire directement."}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      id="name"
                      name="name"
                      label="Votre Nom"
                      type="text"
                      value={formState.name}
                      error={fieldErrors.name}
                      onChange={(v) => setFormState({ ...formState, name: v })}
                    />
                    <FormField
                      id="email"
                      name="email"
                      label="Votre E-mail"
                      type="email"
                      value={formState.email}
                      error={fieldErrors.email}
                      onChange={(v) => setFormState({ ...formState, email: v })}
                    />
                  </div>

                  <FormField
                    id="subject"
                    name="subject"
                    label="Sujet"
                    type="text"
                    value={formState.subject}
                    error={fieldErrors.subject}
                    onChange={(v) => setFormState({ ...formState, subject: v })}
                  />

                  <div>
                    <label htmlFor="message" className="mb-1.5 block text-[12px] font-medium text-[var(--nurea-text-muted)]">
                      Votre Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      aria-invalid={Boolean(fieldErrors.message)}
                      aria-describedby={fieldErrors.message ? "message-error" : undefined}
                      className="block min-h-[128px] w-full resize-y border border-[var(--nurea-border)] bg-transparent px-3 py-3 text-[14px] text-[var(--nurea-text)] outline-none transition-colors focus:border-[var(--nurea-accent)]"
                    />
                    {fieldErrors.message ? (
                      <p id="message-error" className="mt-1 text-[12px] text-[var(--nurea-accent)]" role="alert">
                        {fieldErrors.message}
                      </p>
                    ) : null}
                  </div>

                  <p className="text-[12px] leading-relaxed text-[var(--nurea-text-muted)] italic">
                    Précisez la marque et le nom du parfum pour une réponse plus précise.
                  </p>

                  {serverError ? (
                    <p className="text-[12px] text-[var(--nurea-accent)]" role="alert">
                      {serverError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-nurea btn-accent mt-2 w-full justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? "Transmission…" : (
                      <>
                        Envoyer le message
                        <Send size={13} className="text-white" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
};

const FormField = ({
  id,
  name,
  label,
  type,
  value,
  error,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) => {
  const errId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-[var(--nurea-text-muted)]">
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : undefined}
        className="block min-h-[48px] w-full border border-[var(--nurea-border)] bg-transparent px-3 py-2 text-[14px] text-[var(--nurea-text)] outline-none transition-colors focus:border-[var(--nurea-accent)]"
      />
      {error ? (
        <p id={errId} className="mt-1 text-[12px] text-[var(--nurea-accent)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
