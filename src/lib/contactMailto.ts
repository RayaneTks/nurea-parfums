import { CONTACT } from "@/lib/data";

export function buildContactMailto(fields: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const subject = `[Nurea] ${fields.subject}`.trim();
  const body = `Nom : ${fields.name}\nE-mail : ${fields.email}\n\n${fields.message}`;
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
