import type { Metadata } from "next";
import { ContactPageClient } from "@/components/contact/ContactPageClient";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conciergerie privée",
  description: `Contact officiel ${SITE_NAME} — WhatsApp, Snapchat, e-mail. Conciergerie pour achats, recommandations et disponibilités. Site ${SITE_URL.replace("https://", "")}.`,
  keywords: [
    "contact Nurea Parfums",
    "conciergerie Nurea",
    "WhatsApp Nurea Parfums",
  ],
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `Conciergerie — ${SITE_NAME}`,
    description: `Contactez la conciergerie ${SITE_NAME} (site officiel).`,
    url: `${SITE_URL}/contact`,
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
