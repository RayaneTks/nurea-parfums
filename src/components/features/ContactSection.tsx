"use client";

import type { FC, FormEvent } from "react";
import { useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ArrowRight, Send } from "lucide-react";
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

  const whatsappIcon = isDark
    ? "/branding/icons/nurea_icon_whatsapp_ivory.svg"
    : "/branding/icons/nurea_icon_whatsapp_bordeaux.svg";
  const snapchatIcon = isDark
    ? "/branding/icons/nurea_icon_snapchat_ivory.svg"
    : "/branding/icons/nurea_icon_snapchat_bordeaux.svg";

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
        "Envoi impossible pour le moment. Réessayez ou utilisez WhatsApp."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="relative w-full overflow-x-clip">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[500px] -translate-x-1/2 bg-[var(--nurea-accent)] opacity-[0.025] blur-[100px]" />

      <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-28 md:px-10 md:pb-24 md:pt-40">
        <ScrollReveal className="mx-auto mb-16 max-w-2xl text-center md:mb-24">
          <span className="mb-4 block text-[11px] font-medium uppercase tracking-nurea-wide text-[var(--nurea-accent)] md:text-[12px]">
            Conciergerie Privée
          </span>
          <h1 className="mb-5 font-serif text-[clamp(30px,6vw,52px)] leading-[1.08] text-[var(--nurea-text)]">
            L&apos;Art de <em className="italic">l&apos;Échange</em>
          </h1>
          <p className="mx-auto max-w-md text-[13px] leading-[1.85] text-[var(--nurea-text-muted)] md:text-[14px]">
            Le site présente notre sélection comme une vitrine de la maison.
            Pour confirmer une disponibilité, reprendre un échange ou demander
            un conseil olfactif, la conciergerie vous répond sur les canaux de
            la maison.
          </p>
        </ScrollReveal>

        <ScrollReveal
          direction="scale"
          className="mb-16 flex justify-center md:mb-24"
        >
          <Image
            src="/branding/separators/nurea_separator_copper.svg"
            alt=""
            width={100}
            height={10}
            className="h-auto w-auto max-w-[90px] opacity-25"
          />
        </ScrollReveal>

        <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-2 md:gap-16">
          <ScrollReveal direction="left" className="flex flex-col gap-4">
            <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-text-muted)]">
              Continuer la discussion
            </h2>

            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-4 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-5 py-5 transition-all duration-500 hover:border-[var(--nurea-accent)] hover:bg-[var(--nurea-surface-hover)] active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-colors duration-300 group-hover:border-[var(--nurea-accent)]">
                <Image src={whatsappIcon} alt="" width={22} height={22} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="mb-0.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] md:text-[11px]">
                  Canal prioritaire
                </span>
                <span className="font-serif text-base text-[var(--nurea-text)] md:text-lg">
                  WhatsApp
                </span>
              </div>
              <ArrowRight
                size={15}
                className="shrink-0 text-[var(--nurea-accent)] transition-transform duration-300 group-hover:-rotate-45"
              />
            </a>

            <a
              href={CONTACT.snapchat}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-4 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-5 py-5 transition-all duration-500 hover:border-[var(--nurea-snapchat)] hover:bg-[var(--nurea-surface-hover)] active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-colors duration-300 group-hover:border-[var(--nurea-snapchat)]">
                <Image src={snapchatIcon} alt="" width={22} height={22} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="mb-0.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] md:text-[11px]">
                  Reprendre l&apos;échange
                </span>
                <span className="font-serif text-base text-[var(--nurea-text)] md:text-lg">
                  Snapchat
                </span>
              </div>
              <ArrowRight
                size={15}
                className="shrink-0 text-[var(--nurea-text-muted)] transition-transform duration-300 group-hover:-rotate-45"
              />
            </a>

            <div className="mt-3 border-t border-[var(--nurea-border)] pt-5">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] md:text-[11px]">
                Correspondance
              </span>
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-serif text-sm text-[var(--nurea-text)] transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                {CONTACT.email}
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={120}>
            <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-6 md:p-8">
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-nurea-wide text-[var(--nurea-text-muted)]">
                Nous écrire
              </h3>
              <p className="mb-7 font-serif text-lg text-[var(--nurea-text)] md:text-xl">
                Un message, une demande
              </p>

              {isSubmitted ? (
                <div className="animate-fade-in-up flex flex-col items-center justify-center py-14 text-center">
                  <Image
                    src="/branding/monogram/np-circle-cuivre.png"
                    alt=""
                    width={48}
                    height={48}
                    className="mb-6 opacity-45"
                  />
                  <span className="mb-2 text-[11px] uppercase tracking-nurea-wide text-[var(--nurea-accent)]">
                    {submitChannel === "resend" ? "Conciergerie" : "Messagerie"}
                  </span>
                  <h4 className="mb-3 font-serif text-xl text-[var(--nurea-text)]">
                    {submitChannel === "resend"
                      ? "Votre message a bien été transmis."
                      : "Votre message est prêt dans votre messagerie."}
                  </h4>
                  <p className="max-w-xs text-[12px] leading-[1.8] text-[var(--nurea-text-muted)]">
                    {submitChannel === "resend" ? (
                      <>
                        La conciergerie reviendra vers vous avec la suite la
                        plus adaptée à votre demande.
                      </>
                    ) : (
                      <>
                        Si votre application e-mail ne s&apos;ouvre pas, écrivez
                        directement à{" "}
                        <a
                          className="text-[var(--nurea-accent)] underline-offset-2 hover:underline"
                          href={`mailto:${CONTACT.email}`}
                        >
                          {CONTACT.email}
                        </a>
                        .
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6" noValidate>
                  <div className="grid gap-6 md:grid-cols-2">
                    <FloatingInput
                      id="name"
                      name="name"
                      label="Nom & Prénom"
                      type="text"
                      value={formState.name}
                      error={fieldErrors.name}
                      onChange={(v) =>
                        setFormState({ ...formState, name: v })
                      }
                    />
                    <FloatingInput
                      id="email"
                      name="email"
                      label="E-mail"
                      type="email"
                      value={formState.email}
                      error={fieldErrors.email}
                      onChange={(v) =>
                        setFormState({ ...formState, email: v })
                      }
                    />
                  </div>

                  <FloatingInput
                    id="subject"
                    name="subject"
                    label="Sujet de votre demande"
                    type="text"
                    value={formState.subject}
                    error={fieldErrors.subject}
                    onChange={(v) =>
                      setFormState({ ...formState, subject: v })
                    }
                  />

                  <div className="relative pt-2">
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formState.message}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          message: e.target.value,
                        })
                      }
                      aria-invalid={Boolean(fieldErrors.message)}
                      aria-describedby={
                        fieldErrors.message ? "message-error" : undefined
                      }
                      className="peer block w-full resize-none rounded-sm border-b border-[var(--nurea-border)] bg-transparent py-3 text-[12px] text-[var(--nurea-text)] outline-none transition-colors duration-300 focus:border-[var(--nurea-accent)] md:text-[13px]"
                      placeholder=" "
                    />
                    <label
                      htmlFor="message"
                      className={`absolute left-0 top-5 text-[12px] text-[var(--nurea-text-muted)] transition-all duration-300 peer-focus:-top-1 peer-focus:text-[8px] peer-focus:uppercase peer-focus:tracking-[0.2em] peer-focus:text-[var(--nurea-accent)] md:text-[13px] ${
                        formState.message
                          ? "-top-1 text-[8px] uppercase tracking-[0.2em] text-[var(--nurea-accent)]"
                          : ""
                      }`}
                    >
                      Votre message
                    </label>
                    {fieldErrors.message ? (
                      <p
                        id="message-error"
                        className="mt-2 text-[11px] text-[var(--nurea-accent)]"
                        role="alert"
                      >
                        {fieldErrors.message}
                      </p>
                    ) : null}
                  </div>

                  <p className="text-[11px] leading-relaxed text-[var(--nurea-text-muted)]">
                    WhatsApp reste le canal le plus direct pour une référence
                    précise. Ce formulaire convient si vous préférez initier ou
                    reprendre l&apos;échange par écrit.
                  </p>

                  {serverError ? (
                    <p className="text-[11px] text-[var(--nurea-accent)]" role="alert">
                      {serverError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-nurea mt-3 w-full justify-center rounded-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      "Envoi…"
                    ) : (
                      <>
                        Envoyer la demande
                        <Send size={12} className="text-[var(--nurea-accent)]" />
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

const FloatingInput = ({
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
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : undefined}
        className="peer block w-full rounded-sm border-b border-[var(--nurea-border)] bg-transparent py-3 text-[12px] text-[var(--nurea-text)] outline-none transition-colors duration-300 focus:border-[var(--nurea-accent)] md:text-[13px]"
        placeholder=" "
      />
      <label
        htmlFor={id}
        className={`absolute left-0 top-3 text-[12px] text-[var(--nurea-text-muted)] transition-all duration-300 peer-focus:-top-4 peer-focus:text-[8px] peer-focus:uppercase peer-focus:tracking-[0.2em] peer-focus:text-[var(--nurea-accent)] md:text-[13px] ${
          value
            ? "-top-4 text-[8px] uppercase tracking-[0.2em] text-[var(--nurea-accent)]"
            : ""
        }`}
      >
        {label}
      </label>
      {error ? (
        <p id={errId} className="mt-2 text-[11px] text-[var(--nurea-accent)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
