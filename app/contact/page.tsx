import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact officiel ${SITE_NAME} — messagerie, e-mail. Achats, recommandations et disponibilités avec la maison. Site ${SITE_URL.replace("https://", "")}.`,
  keywords: [
    "contact Nurea Parfums",
    "Nurea Parfums contact",
    "écrire Nurea Parfums",
  ],
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `Contact — ${SITE_NAME}`,
    description: `Écrire à la maison ${SITE_NAME} (site officiel).`,
    url: `${SITE_URL}/contact`,
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
